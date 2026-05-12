import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test"

import type { Account } from "../src/lib/accounts"

import { mergeConfigWithDefaults, saveConfig } from "../src/lib/config"
import { copilotTokenManager } from "../src/lib/copilot-token-manager"
import { ensurePaths } from "../src/lib/paths"
import { runtimeManager } from "../src/lib/runtime-manager"
import { initializeStartupRuntime } from "../src/lib/startup-runtime"
import { state } from "../src/lib/state"

const originalFetch = globalThis.fetch

const accountA: Account = {
  id: "account-a",
  login: "account-a",
  avatarUrl: "https://example.com/a.png",
  token: "gh-token-a",
  accountType: "individual",
  createdAt: "2026-01-01T00:00:00.000Z",
}

beforeEach(async () => {
  await ensurePaths()
  runtimeManager.clearAccount(accountA.id)
  runtimeManager.clearActiveContext()
  copilotTokenManager.clear()
  state.copilotToken = undefined
  state.githubToken = undefined
  state.models = undefined
  state.vsCodeVersion = "1.117.0"
  state.showToken = false

  const config = mergeConfigWithDefaults()
  await saveConfig({
    ...config,
    accounts: [accountA],
    activeAccountId: accountA.id,
  })
})

afterEach(() => {
  globalThis.fetch = originalFetch
  runtimeManager.clearAccount(accountA.id)
  runtimeManager.clearActiveContext()
  copilotTokenManager.clear()
  state.copilotToken = undefined
  state.githubToken = undefined
  state.models = undefined
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

describe("startup runtime initialization", () => {
  test("continues startup when the active account token refresh fails", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        Response.json(
          {
            message: "Bad credentials",
          },
          {
            status: 401,
          },
        ),
      )) as unknown as typeof fetch

    await initializeStartupRuntime(mergeConfigWithDefaults())

    expect(runtimeManager.getActiveContext()).toBeNull()
    expect(runtimeManager.getActiveModels()).toBeUndefined()
    expect(state.githubToken).toBeUndefined()
    expect(state.models).toBeUndefined()
  })

  test("initializes runtime models when the active account is valid", async () => {
    globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
      let url: string
      if (typeof input === "string") {
        url = input
      } else if (input instanceof URL) {
        url = input.toString()
      } else {
        url = input.url
      }
      const pathname = new URL(url).pathname
      const authorization = new Headers(init?.headers).get("authorization")

      if (pathname === "/copilot_internal/v2/token") {
        expect(authorization).toBe("token gh-token-a")
        return Promise.resolve(
          Response.json({
            token: "cp-token-a",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_in: 3600,
          }),
        )
      }

      if (pathname === "/models") {
        expect(authorization).toBe("Bearer cp-token-a")
        return Promise.resolve(
          Response.json({
            object: "list",
            data: [
              {
                id: "model-a",
                name: "model-a",
                object: "model",
                preview: false,
                vendor: "test",
                version: "1",
                model_picker_enabled: true,
                supported_endpoints: [
                  "/chat/completions",
                  "/responses",
                  "/v1/messages",
                ],
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
          }),
        )
      }

      throw new Error(`Unexpected fetch request during startup: ${pathname}`)
    }) as unknown as typeof fetch

    await initializeStartupRuntime(mergeConfigWithDefaults())

    expect(runtimeManager.getActiveContext()?.accountId).toBe(accountA.id)
    expect(runtimeManager.getActiveModels()?.data[0]?.id).toBe("model-a")
    expect(state.githubToken).toBe("gh-token-a")
    expect(state.models?.data[0]?.id).toBe("model-a")
  })
})
