import type { MiddlewareHandler } from "hono"

import {
  AccountSelectionError,
  selectAccountForRequest,
} from "./account-selector"
import { getAccounts, type Account } from "./accounts"
import { getAccountSelectionConfig } from "./config"
import { createHandlerLogger } from "./logger"
import { runtimeContext } from "./runtime-context"
import { runtimeManager } from "./runtime-manager"
import { resolveConversationIdFromHeaders } from "./session"
import { state } from "./state"

const logger = createHandlerLogger("account-selection")

const PROXY_GENERATION_PATHS = new Set([
  "/chat/completions",
  "/embeddings",
  "/responses",
  "/v1/chat/completions",
  "/v1/embeddings",
  "/v1/messages",
  "/v1/responses",
])

export function isProxyGenerationRequest(
  method: string,
  path: string,
): boolean {
  if (method.toUpperCase() !== "POST") {
    return false
  }

  const normalizedPath = normalizePath(path)
  if (PROXY_GENERATION_PATHS.has(normalizedPath)) {
    return true
  }

  return /^\/v1beta\/models\/[^/]+:(?:generateContent|streamGenerateContent)$/.test(
    normalizedPath,
  )
}

export const accountSelectionMiddleware: MiddlewareHandler = async (
  c,
  next,
) => {
  const method = c.req.method
  const path = c.req.path

  if (!isProxyGenerationRequest(method, path)) {
    await runWithActiveContext(next)
    return
  }

  const accountSelection = getAccountSelectionConfig()
  if (accountSelection.mode === "active_only") {
    await runWithActiveContext(next)
    return
  }

  const accountsData = await getAccounts()
  const activeAccount = resolveActiveAccount(accountsData)
  const conversationResolution = resolveConversationIdFromHeaders(c)
  const selectionResult = selectAccountSafely({
    activeAccount,
    accounts: accountsData.accounts,
    config: accountSelection,
    method,
    path,
    conversationId: conversationResolution.conversationId,
  })

  if (selectionResult instanceof Response) {
    return selectionResult
  }

  try {
    const selectedContext = await runtimeManager.getOrPrepareAccountContext(
      selectionResult.account,
    )

    logSelection({
      account: selectionResult.account,
      eligibleAccountIds: selectionResult.eligibleAccountIds,
      method,
      path,
      reason: selectionResult.reason,
    })

    await runtimeContext.run(selectedContext, async () => {
      await next()
    })
    return
  } catch (error) {
    logger.error("Failed to prepare selected account runtime context:", {
      accountId: selectionResult.account.id,
      error,
      method,
      path,
    })
    return c.json(
      {
        error: {
          message: "Failed to prepare runtime for the selected account",
          type: "account_selection_error",
        },
      },
      503,
    )
  }
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1)
  }

  return path
}

function resolveActiveAccount(accountsData: {
  activeAccountId: string | null
  accounts: Array<Account>
}): Account | null {
  if (!accountsData.activeAccountId) {
    return accountsData.accounts[0] ?? null
  }

  return (
    accountsData.accounts.find(
      (account) => account.id === accountsData.activeAccountId,
    )
    ?? accountsData.accounts.at(0)
    ?? null
  )
}

async function runWithActiveContext(next: () => Promise<void>): Promise<void> {
  await runtimeContext.run(runtimeManager.getActiveContext(), async () => {
    await next()
  })
}

function selectAccountSafely(options: {
  activeAccount: Account | null
  accounts: Array<Account>
  config: ReturnType<typeof getAccountSelectionConfig>
  conversationId: string | undefined
  method: string
  path: string
}): ReturnType<typeof selectAccountForRequest> | Response {
  try {
    return selectAccountForRequest({
      activeAccount: options.activeAccount,
      accounts: options.accounts,
      config: options.config,
      request: {
        conversationId: options.conversationId,
        method: options.method,
        path: options.path,
      },
    })
  } catch (error) {
    if (error instanceof AccountSelectionError) {
      return Response.json(
        {
          error: {
            message: error.message,
            type: "account_selection_error",
          },
        },
        {
          status: 503,
        },
      )
    }

    throw error
  }
}

function logSelection(options: {
  account: Account
  eligibleAccountIds: Array<string>
  method: string
  path: string
  reason: string
}): void {
  if (!state.isDevelopment) {
    return
  }

  logger.info("Selected request runtime account:", {
    accountId: options.account.id,
    eligibleAccountIds: options.eligibleAccountIds,
    login: options.account.login,
    method: options.method,
    path: options.path,
    reason: options.reason,
  })
}
