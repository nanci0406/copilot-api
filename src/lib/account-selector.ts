import type { Account } from "./accounts"
import type { ResolvedAccountSelectionConfig } from "./config"

export interface AccountSelectionRequest {
  conversationId?: string
  method: string
  model?: string
  path: string
}

export interface AccountSelectorState {
  lastUsedAtByAccountId: Map<string, number>
  roundRobinCursorByScopeKey: Map<string, number>
  stickySessionsByConversationId: Map<
    string,
    {
      accountId: string
      expiresAt: number
    }
  >
}

export interface SelectAccountOptions {
  activeAccount: Account | null
  accounts: ReadonlyArray<Account>
  config: ResolvedAccountSelectionConfig
  now?: number
  request: AccountSelectionRequest
  state?: AccountSelectorState
}

export interface AccountSelectionResult {
  account: Account
  eligibleAccountIds: Array<string>
  reason:
    | "active_only"
    | "least_recently_used"
    | "quota_aware_fallback_least_recently_used"
    | "round_robin"
    | "sticky_session"
}

export class AccountSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AccountSelectionError"
  }
}

export function createAccountSelectorState(): AccountSelectorState {
  return {
    lastUsedAtByAccountId: new Map(),
    roundRobinCursorByScopeKey: new Map(),
    stickySessionsByConversationId: new Map(),
  }
}

const defaultAccountSelectorState = createAccountSelectorState()

export function getEligibleAccounts(options: {
  activeAccount: Account | null
  accounts: ReadonlyArray<Account>
  config: ResolvedAccountSelectionConfig
}): Array<Account> {
  if (options.config.mode === "active_only") {
    return options.activeAccount && isSelectableAccount(options.activeAccount) ?
        [options.activeAccount]
      : []
  }

  if (options.config.poolScope === "selected_accounts") {
    const accountById = new Map(
      options.accounts.map((account) => [account.id, account]),
    )

    return options.config.selectedAccountIds
      .map((accountId) => accountById.get(accountId))
      .filter((account): account is Account => isSelectableAccount(account))
  }

  return options.accounts.filter((account) => isSelectableAccount(account))
}

export function selectAccountForRequest(
  options: SelectAccountOptions,
): AccountSelectionResult {
  const now = options.now ?? Date.now()
  const state = options.state ?? defaultAccountSelectorState
  pruneExpiredStickySessions(state, now)
  const eligibleAccounts = getEligibleAccounts(options)
  const eligibleAccountIds = eligibleAccounts.map((account) => account.id)

  if (eligibleAccounts.length === 0) {
    const message =
      options.config.mode === "active_only" ?
        "No active account is available for this request"
      : "No eligible account is available for the configured account pool"
    throw new AccountSelectionError(message)
  }

  if (options.config.mode === "active_only") {
    const account = eligibleAccounts[0]
    recordAccountUse(state, account.id, now)
    return {
      account,
      eligibleAccountIds,
      reason: "active_only",
    }
  }

  const stickyAccount = resolveStickyAccount({
    eligibleAccounts,
    now,
    request: options.request,
    state,
  })
  if (options.config.stickySessions && stickyAccount) {
    recordAccountUse(state, stickyAccount.id, now)
    extendStickySession({
      account: stickyAccount,
      config: options.config,
      now,
      request: options.request,
      state,
    })
    return {
      account: stickyAccount,
      eligibleAccountIds,
      reason: "sticky_session",
    }
  }

  const result =
    options.config.selectorStrategy === "round_robin" ?
      selectRoundRobinAccount(eligibleAccounts, state)
    : selectLeastRecentlyUsedAccount(eligibleAccounts, state)
  const reason =
    options.config.selectorStrategy === "quota_aware" ?
      "quota_aware_fallback_least_recently_used"
    : options.config.selectorStrategy

  recordAccountUse(state, result.id, now)
  if (options.config.stickySessions) {
    extendStickySession({
      account: result,
      config: options.config,
      now,
      request: options.request,
      state,
    })
  }

  return {
    account: result,
    eligibleAccountIds,
    reason,
  }
}

export function resetDefaultAccountSelectorState(): void {
  defaultAccountSelectorState.lastUsedAtByAccountId.clear()
  defaultAccountSelectorState.roundRobinCursorByScopeKey.clear()
  defaultAccountSelectorState.stickySessionsByConversationId.clear()
}

function isSelectableAccount(account: Account | undefined): account is Account {
  if (!account) {
    return false
  }

  const accountWithFutureFlags = account as Account & {
    disabled?: unknown
  }
  return accountWithFutureFlags.disabled !== true
}

function resolveStickyAccount(options: {
  eligibleAccounts: ReadonlyArray<Account>
  now: number
  request: AccountSelectionRequest
  state: AccountSelectorState
}): Account | null {
  const conversationId = options.request.conversationId
  if (!conversationId) {
    return null
  }

  const stickySession =
    options.state.stickySessionsByConversationId.get(conversationId)
  if (!stickySession) {
    return null
  }

  if (stickySession.expiresAt <= options.now) {
    options.state.stickySessionsByConversationId.delete(conversationId)
    return null
  }

  return (
    options.eligibleAccounts.find(
      (account) => account.id === stickySession.accountId,
    ) ?? null
  )
}

function pruneExpiredStickySessions(
  state: AccountSelectorState,
  now: number,
): void {
  for (const [
    conversationId,
    stickySession,
  ] of state.stickySessionsByConversationId) {
    if (stickySession.expiresAt <= now) {
      state.stickySessionsByConversationId.delete(conversationId)
    }
  }
}

function extendStickySession(options: {
  account: Account
  config: ResolvedAccountSelectionConfig
  now: number
  request: AccountSelectionRequest
  state: AccountSelectorState
}): void {
  const conversationId = options.request.conversationId
  if (!conversationId) {
    return
  }

  options.state.stickySessionsByConversationId.set(conversationId, {
    accountId: options.account.id,
    expiresAt: options.now + options.config.stickySessionTtlMinutes * 60 * 1000,
  })
}

function recordAccountUse(
  state: AccountSelectorState,
  accountId: string,
  now: number,
): void {
  state.lastUsedAtByAccountId.set(accountId, now)
}

function selectLeastRecentlyUsedAccount(
  accounts: ReadonlyArray<Account>,
  state: AccountSelectorState,
): Account {
  return accounts.reduce((selected, account) => {
    const selectedLastUsedAt = state.lastUsedAtByAccountId.get(selected.id) ?? 0
    const accountLastUsedAt = state.lastUsedAtByAccountId.get(account.id) ?? 0

    return accountLastUsedAt < selectedLastUsedAt ? account : selected
  })
}

function selectRoundRobinAccount(
  accounts: ReadonlyArray<Account>,
  state: AccountSelectorState,
): Account {
  const scopeKey = accounts.map((account) => account.id).join(",")
  const cursor = state.roundRobinCursorByScopeKey.get(scopeKey) ?? 0
  const account = accounts[cursor % accounts.length]

  state.roundRobinCursorByScopeKey.set(scopeKey, cursor + 1)
  return account
}
