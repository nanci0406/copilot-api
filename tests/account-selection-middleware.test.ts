import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"
import { Hono } from "hono"

import type { Account } from "../src/lib/accounts"
import type { ResolvedAccountSelectionConfig } from "../src/lib/config"

import { accountSelectionMiddleware } from "../src/lib/account-selection-middleware"
import { resetDefaultAccountSelectorState } from "../src/lib/account-selector"
import { mergeConfigWithDefaults, saveConfig } from "../src/lib/config"
import { copilotTokenManager } from "../src/lib/copilot-token-manager"
import { runtimeManager } from "../src/lib/runtime-manager"
import { state } from "../src/lib/state"
import { clearUsageLogs, listUsageLogs } from "../src/lib/usage-log-store"
import { completionRoutes } from "../src/routes/chat-completions/route"
import { modelRoutes } from "../src/routes/models/route"

const originalFetch = globalThis.fetch
const originalSetTimeout = globalThis.setTimeout

type TimeoutHandler = Parameters<typeof setTimeout>[0]

interface FetchRecord {
  authorization: string | null
  pathname: string
}

const fetchRecords = new Array<FetchRecord>()

let accountA: Account
let accountB: Account

function runTimerHandler(handler: TimeoutHandler): void {
  if (typeof handler !== "function") {
    return
  }

  const callback = handler as () => void
  callback()
}

function getRequestUrl(input: string | URL | Request): string {
  if (typeof input === "string") {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}

function createAccount(id: string, token: string): Account {
  return {
    id,
    login: id,
    avatarUrl: `https://example.com/${id}.png`,
    token,
    accountType: "individual",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}

function createModelsResponse(): Response {
  return Response.json({
    object: "list",
    data: [
      {
        id: "shared-model",
        name: "shared-model",
        object: "model",
        preview: false,
        vendor: "test",
        version: "1",
        model_picker_enabled: true,
        supported_endpoints: ["/chat/completions"],
        capabilities: {
          family: "test",
          limits: {
            max_output_tokens: 1024,
            max_prompt_tokens: 4096,
          },
          object: "capabilities",
          supports: {
            streaming: true,
          },
          tokenizer: "o200k_base",
          type: "chat",
        },
      },
    ],
  })
}

function createChatResponse(model: string): Response {
  return Response.json({
    id: "chat_1",
    object: "chat.completion",
    created: 1,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "ok",
        },
        logprobs: null,
        finish_reason: "stop",
      },
    ],
  })
}

function createUsageResponse(): Response {
  return Response.json({
    chat_enabled: true,
    quota_reset_date: "2099-01-01",
    quota_snapshots: {
      premium_interactions: {
        entitlement: 100,
        remaining: 99,
        unlimited: false,
        overage_count: 0,
        overage_permitted: false,
        percent_remaining: 99,
        quota_id: "premium",
        quota_remaining: 99,
      },
      chat: {
        entitlement: 100,
        remaining: 99,
        unlimited: false,
        overage_count: 0,
        overage_permitted: false,
        percent_remaining: 99,
        quota_id: "chat",
        quota_remaining: 99,
      },
      completions: {
        entitlement: 100,
        remaining: 99,
        unlimited: false,
        overage_count: 0,
        overage_permitted: false,
        percent_remaining: 99,
        quota_id: "completions",
        quota_remaining: 99,
      },
    },
  })
}

function createTestApp(): Hono {
  const app = new Hono()
  app.use("*", accountSelectionMiddleware)
  app.route("/chat/completions", completionRoutes)
  app.route("/models", modelRoutes)
  return app
}

async function saveAccountSelectionConfig(
  overrides: Partial<ResolvedAccountSelectionConfig>,
): Promise<void> {
  const config = mergeConfigWithDefaults()
  await saveConfig({
    ...config,
    accounts: [accountA, accountB],
    activeAccountId: accountA.id,
    accountSelection: {
      ...config.accountSelection,
      ...overrides,
    },
    usageLogCountMode: "request",
  })
}

async function requestChat(
  app: Hono,
  headers: Record<string, string> = {},
): Promise<Response> {
  return await app.request("http://localhost/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      model: "shared-model",
      messages: [{ role: "user", content: "hello" }],
      stream: false,
    }),
  })
}

beforeEach(async () => {
  const id = crypto.randomUUID()
  accountA = createAccount(`middleware-a-${id}`, `gh-token-a-${id}`)
  accountB = createAccount(`middleware-b-${id}`, `gh-token-b-${id}`)

  fetchRecords.length = 0
  resetDefaultAccountSelectorState()
  runtimeManager.clearActiveContext()
  runtimeManager.clearAccount(accountA.id)
  runtimeManager.clearAccount(accountB.id)
  copilotTokenManager.clear()
  state.accountType = "individual"
  state.copilotToken = undefined
  state.githubToken = undefined
  state.models = undefined
  state.vsCodeVersion = "1.0.0"
  state.rateLimitSeconds = undefined
  state.lastRequestTimestamp = undefined
  state.rateLimitWait = false

  globalThis.setTimeout = ((handler: TimeoutHandler) => {
    runTimerHandler(handler)
    return 0
  }) as unknown as typeof setTimeout

  globalThis.fetch = ((input, init) => {
    const url = getRequestUrl(input)
    const pathname = new URL(url).pathname
    const authorization = new Headers(init?.headers).get("authorization")
    fetchRecords.push({ authorization, pathname })

    if (pathname === "/copilot_internal/v2/token") {
      const token =
        authorization === `token ${accountB.token}` ? "cp-token-b" : (
          "cp-token-a"
        )
      return Promise.resolve(
        Response.json({
          token,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_in: 3600,
        }),
      )
    }

    if (pathname === "/models") {
      return Promise.resolve(createModelsResponse())
    }

    if (pathname === "/copilot_internal/user") {
      return Promise.resolve(createUsageResponse())
    }

    const model =
      authorization === "Bearer cp-token-b" ? "served-by-b" : "served-by-a"
    return Promise.resolve(createChatResponse(model))
  }) as typeof fetch

  await saveAccountSelectionConfig({
    mode: "active_only",
  })
  clearUsageLogs(accountA.id)
  clearUsageLogs(accountB.id)
  await runtimeManager.initialize(accountA)
  fetchRecords.length = 0
})

afterEach(() => {
  clearUsageLogs(accountA.id)
  clearUsageLogs(accountB.id)
  runtimeManager.clearAccount(accountA.id)
  runtimeManager.clearAccount(accountB.id)
  runtimeManager.clearActiveContext()
  copilotTokenManager.clear()
  state.copilotToken = undefined
  state.githubToken = undefined
  state.models = undefined
})

afterAll(() => {
  globalThis.fetch = originalFetch
  globalThis.setTimeout = originalSetTimeout
})

describe("account selection middleware", () => {
  test("keeps active_only generation requests on the active account", async () => {
    const app = createTestApp()
    const response = await requestChat(app)
    const body = (await response.json()) as { model: string }

    expect(response.status).toBe(200)
    expect(body.model).toBe("served-by-a")
    expect(runtimeManager.getActiveContext()?.accountId).toBe(accountA.id)
  })

  test("rotates account_pool generation requests without switching active account", async () => {
    await saveAccountSelectionConfig({
      mode: "account_pool",
      poolScope: "all_accounts",
      selectorStrategy: "round_robin",
      stickySessions: false,
    })
    const app = createTestApp()

    const firstResponse = await requestChat(app)
    const secondResponse = await requestChat(app)
    const firstBody = (await firstResponse.json()) as { model: string }
    const secondBody = (await secondResponse.json()) as { model: string }
    const chatAuthorizations = fetchRecords
      .filter((record) => record.pathname === "/chat/completions")
      .map((record) => record.authorization)

    expect(firstBody.model).toBe("served-by-a")
    expect(secondBody.model).toBe("served-by-b")
    expect(chatAuthorizations).toEqual([
      "Bearer cp-token-a",
      "Bearer cp-token-b",
    ])
    expect(runtimeManager.getActiveContext()?.accountId).toBe(accountA.id)
    expect(
      listUsageLogs({ accountId: accountA.id, limit: 10 }).logs,
    ).toHaveLength(1)
    expect(
      listUsageLogs({ accountId: accountB.id, limit: 10 }).logs,
    ).toHaveLength(1)
  })

  test("keeps sticky conversations on the same account", async () => {
    await saveAccountSelectionConfig({
      mode: "account_pool",
      poolScope: "all_accounts",
      selectorStrategy: "least_recently_used",
      stickySessions: true,
      stickySessionTtlMinutes: 5,
    })
    const app = createTestApp()

    await requestChat(app, {
      "x-session-id": "sticky-thread",
    })
    await requestChat(app, {
      "x-session-id": "sticky-thread",
    })

    const chatAuthorizations = fetchRecords
      .filter((record) => record.pathname === "/chat/completions")
      .map((record) => record.authorization)

    expect(chatAuthorizations).toEqual([
      "Bearer cp-token-a",
      "Bearer cp-token-a",
    ])
  })

  test("keeps non-generation model requests on active runtime", async () => {
    await saveAccountSelectionConfig({
      mode: "account_pool",
      poolScope: "all_accounts",
      selectorStrategy: "round_robin",
      stickySessions: false,
    })
    const app = createTestApp()

    const response = await app.request("http://localhost/models")
    const tokenRefreshAuthorizations = fetchRecords
      .filter((record) => record.pathname === "/copilot_internal/v2/token")
      .map((record) => record.authorization)

    expect(response.status).toBe(200)
    expect(tokenRefreshAuthorizations).not.toContain(`token ${accountB.token}`)
    expect(runtimeManager.getActiveContext()?.accountId).toBe(accountA.id)
  })
})
