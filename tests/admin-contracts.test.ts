import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { Hono } from "hono"

import {
  accountsResponseSchema,
  adminApiRouteManifest,
  adminAuthStatusSchema,
  adminSettingsResponseSchema,
  publicAdminApiPaths,
} from "../packages/admin-contracts/src/index"
import {
  hashAdminSecret,
  resetAdminAuthRuntimeState,
} from "../src/lib/admin-auth"
import {
  mergeConfigWithDefaults,
  saveConfig,
  type ReadonlyAppConfig,
} from "../src/lib/config"
import { adminRoutes } from "../src/routes/admin/route"

const originalConfig = mergeConfigWithDefaults()
const originalAdminSecret = process.env.ADMIN_SECRET
const originalAdminSecretHash = process.env.ADMIN_SECRET_HASH

function createAdminApp(): Hono {
  const app = new Hono()
  app.route("/admin", adminRoutes)
  return app
}

function getCookieHeader(response: Response): string {
  const setCookie = response.headers.get("set-cookie")
  expect(setCookie).toBeTruthy()

  if (!setCookie) {
    throw new Error("expected set-cookie header")
  }

  return setCookie.split(";")[0]
}

async function saveBaseConfig(config: ReadonlyAppConfig): Promise<void> {
  await saveConfig({
    ...config,
    accounts: [],
    activeAccountId: null,
    adminAuth: {
      ...config.adminAuth,
      secretHash: undefined,
    },
  })
}

beforeEach(async () => {
  resetAdminAuthRuntimeState()
  delete process.env.ADMIN_SECRET
  delete process.env.ADMIN_SECRET_HASH
  await saveBaseConfig(originalConfig)
})

afterAll(async () => {
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET
  } else {
    process.env.ADMIN_SECRET = originalAdminSecret
  }

  if (originalAdminSecretHash === undefined) {
    delete process.env.ADMIN_SECRET_HASH
  } else {
    process.env.ADMIN_SECRET_HASH = originalAdminSecretHash
  }

  await saveConfig(originalConfig)
})

describe("admin contracts", () => {
  test("tracks the full current admin api route surface", () => {
    expect(
      adminApiRouteManifest.map((route) => `${route.method} ${route.path}`),
    ).toEqual([
      "GET /api/session",
      "POST /api/session/login",
      "POST /api/session/logout",
      "POST /api/setup",
      "GET /api/accounts",
      "GET /api/accounts/active",
      "PUT /api/accounts/reorder",
      "POST /api/accounts/:id/activate",
      "DELETE /api/accounts/:id",
      "GET /api/account-selection",
      "PUT /api/account-selection",
      "POST /api/auth/device-code",
      "POST /api/auth/poll",
      "GET /api/auth/status",
      "GET /api/usage-logs",
      "POST /api/usage-logs/clear",
      "POST /api/usage-logs/clear-all",
      "GET /api/model-mappings",
      "PUT /api/model-mappings/:from",
      "DELETE /api/model-mappings/:from",
      "GET /api/premium-multipliers",
      "PUT /api/premium-multipliers/:model",
      "DELETE /api/premium-multipliers/:model",
      "PUT /api/reasoning-efforts/:model",
      "PUT /api/model-visibility/:model",
      "GET /api/models",
      "GET /api/settings",
      "PUT /api/settings",
      "GET /api/usage-summary",
    ])

    expect(publicAdminApiPaths).toEqual([
      "/api/session",
      "/api/session/login",
      "/api/setup",
    ])
  })

  test("parses the public admin session payload", async () => {
    const app = createAdminApp()

    const response = await app.request("http://localhost/admin/api/session")

    expect(response.status).toBe(200)
    expect(adminAuthStatusSchema.parse(await response.json())).toMatchObject({
      configured: false,
      requiresSetup: true,
    })
  })

  test("parses protected settings and accounts payloads after login", async () => {
    const app = createAdminApp()
    const secretHash = await hashAdminSecret("contracts-secret")

    await saveConfig({
      ...mergeConfigWithDefaults(),
      accounts: [],
      activeAccountId: null,
      adminAuth: {
        ...mergeConfigWithDefaults().adminAuth,
        secretHash,
        sessionTtlDays: 7,
        enforceHttps: true,
      },
    })

    const loginResponse = await app.request(
      "http://localhost/admin/api/session/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          secret: "contracts-secret",
        }),
      },
    )

    expect(loginResponse.status).toBe(200)
    const cookie = getCookieHeader(loginResponse)

    const [settingsResponse, accountsResponse] = await Promise.all([
      app.request("http://localhost/admin/api/settings", {
        headers: { cookie },
      }),
      app.request("http://localhost/admin/api/accounts", {
        headers: { cookie },
      }),
    ])

    expect(settingsResponse.status).toBe(200)
    expect(accountsResponse.status).toBe(200)

    const settingsPayload = adminSettingsResponseSchema.parse(
      await settingsResponse.json(),
    )
    const accountsPayload = accountsResponseSchema.parse(
      await accountsResponse.json(),
    )

    expect(settingsPayload.adminSessionTtlDays).toBe(7)
    expect(accountsPayload.accounts).toEqual([])
  })
})
