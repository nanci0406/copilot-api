#!/usr/bin/env node

import consola from "consola"
import { serve, type ServerHandler } from "srvx"

import { mergeConfigWithDefaults } from "./lib/config"
import { ensurePaths } from "./lib/paths"
import { initProxyFromEnv } from "./lib/proxy"
import { initializeStartupRuntime } from "./lib/startup-runtime"
import { state } from "./lib/state"
import { cacheVSCodeVersion } from "./lib/utils"

// Configuration from environment variables
const PORT = Number.parseInt(process.env.PORT || "4141", 10)
const VERBOSE = process.env.VERBOSE === "true" || process.env.DEBUG === "true"
const IS_DEVELOPMENT = process.env.NODE_ENV !== "production"
const RATE_LIMIT =
  process.env.RATE_LIMIT ?
    Number.parseInt(process.env.RATE_LIMIT, 10)
  : undefined
const RATE_LIMIT_WAIT = process.env.RATE_LIMIT_WAIT === "true"
const SHOW_TOKEN = process.env.SHOW_TOKEN === "true"
const PROXY_ENV = process.env.PROXY_ENV === "true"

async function main(): Promise<void> {
  // Ensure config is merged with defaults at startup
  const config = mergeConfigWithDefaults()

  if (PROXY_ENV) {
    initProxyFromEnv()
  }

  state.isDevelopment = IS_DEVELOPMENT
  state.verbose = VERBOSE
  if (VERBOSE) {
    consola.level = 5
    consola.info("Verbose logging enabled")
  }

  state.rateLimitSeconds = RATE_LIMIT ?? config.rateLimitSeconds
  state.rateLimitWait =
    process.env.RATE_LIMIT_WAIT === undefined ?
      (config.rateLimitWait ?? false)
    : RATE_LIMIT_WAIT
  state.showToken = SHOW_TOKEN

  await ensurePaths()
  await cacheVSCodeVersion()

  await initializeStartupRuntime(config)

  const serverUrl = `http://localhost:${PORT}`

  consola.box(`copilot-api server\n\n📋 Account Manager: ${serverUrl}/admin`)

  const { server } = await import("./server")

  serve({
    fetch: server.fetch as ServerHandler,
    port: PORT,
    bun: {
      idleTimeout: 0,
    },
  })
}

main().catch((error: unknown) => {
  consola.error("Failed to start server:", error)
  process.exit(1)
})
