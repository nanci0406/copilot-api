import { describe, expect, test } from "bun:test"

import type { Account } from "../src/lib/accounts"
import type { ResolvedAccountSelectionConfig } from "../src/lib/config"

import {
  AccountSelectionError,
  createAccountSelectorState,
  getEligibleAccounts,
  selectAccountForRequest,
} from "../src/lib/account-selector"

const accountA: Account = {
  id: "account-a",
  login: "account-a",
  avatarUrl: "https://example.com/a.png",
  token: "gh-token-a",
  accountType: "individual",
  createdAt: "2026-01-01T00:00:00.000Z",
}

const accountB: Account = {
  id: "account-b",
  login: "account-b",
  avatarUrl: "https://example.com/b.png",
  token: "gh-token-b",
  accountType: "business",
  createdAt: "2026-01-02T00:00:00.000Z",
}

const accountC: Account = {
  id: "account-c",
  login: "account-c",
  avatarUrl: "https://example.com/c.png",
  token: "gh-token-c",
  accountType: "enterprise",
  createdAt: "2026-01-03T00:00:00.000Z",
}

function createConfig(
  overrides: Partial<ResolvedAccountSelectionConfig> = {},
): ResolvedAccountSelectionConfig {
  return {
    mode: "account_pool",
    poolScope: "all_accounts",
    selectedAccountIds: [],
    stickySessions: true,
    stickySessionTtlMinutes: 720,
    failoverOnRequestError: false,
    selectorStrategy: "least_recently_used",
    ...overrides,
  }
}

function select(
  overrides: {
    activeAccount?: Account | null
    accounts?: ReadonlyArray<Account>
    config?: Partial<ResolvedAccountSelectionConfig>
    conversationId?: string
    now?: number
    state?: ReturnType<typeof createAccountSelectorState>
  } = {},
) {
  const activeAccount =
    Object.hasOwn(overrides, "activeAccount") ?
      (overrides.activeAccount ?? null)
    : accountA

  return selectAccountForRequest({
    activeAccount,
    accounts: overrides.accounts ?? [accountA, accountB, accountC],
    config: createConfig(overrides.config),
    now: overrides.now,
    request: {
      conversationId: overrides.conversationId,
      method: "POST",
      path: "/chat/completions",
    },
    state: overrides.state ?? createAccountSelectorState(),
  })
}

describe("account selector", () => {
  test("uses the active account in active_only mode", () => {
    const result = select({
      activeAccount: accountB,
      config: {
        mode: "active_only",
        selectedAccountIds: [accountA.id],
      },
    })

    expect(result.account.id).toBe(accountB.id)
    expect(result.eligibleAccountIds).toEqual([accountB.id])
    expect(result.reason).toBe("active_only")
  })

  test("throws a clear error when active_only has no active account", () => {
    expect(() =>
      select({
        activeAccount: null,
        config: {
          mode: "active_only",
        },
      }),
    ).toThrow(AccountSelectionError)
  })

  test("filters missing and future disabled accounts from selected scope", () => {
    const disabledAccount = {
      ...accountB,
      disabled: true,
    } as Account & { disabled: true }

    const eligibleAccounts = getEligibleAccounts({
      activeAccount: accountA,
      accounts: [accountA, disabledAccount, accountC],
      config: createConfig({
        poolScope: "selected_accounts",
        selectedAccountIds: ["missing-account", accountB.id, accountC.id],
      }),
    })

    expect(eligibleAccounts.map((account) => account.id)).toEqual([accountC.id])
  })

  test("uses least-recently-used selection with stable tie ordering", () => {
    const state = createAccountSelectorState()

    const first = select({ now: 1000, state })
    const second = select({ now: 2000, state })
    const third = select({ now: 3000, state })

    expect(first.account.id).toBe(accountA.id)
    expect(second.account.id).toBe(accountB.id)
    expect(third.account.id).toBe(accountC.id)
  })

  test("round robin rotates through the eligible scope", () => {
    const state = createAccountSelectorState()
    const config: Partial<ResolvedAccountSelectionConfig> = {
      poolScope: "selected_accounts",
      selectedAccountIds: [accountB.id, accountC.id],
      selectorStrategy: "round_robin",
    }

    const first = select({ config, state })
    const second = select({ config, state })
    const third = select({ config, state })

    expect(first.account.id).toBe(accountB.id)
    expect(second.account.id).toBe(accountC.id)
    expect(third.account.id).toBe(accountB.id)
  })

  test("sticks a conversation to the selected account until ttl expires", () => {
    const state = createAccountSelectorState()
    const first = select({
      conversationId: "conversation-1",
      now: 1000,
      state,
    })
    const second = select({
      conversationId: "conversation-1",
      now: 2000,
      state,
    })

    expect(first.account.id).toBe(accountA.id)
    expect(second.account.id).toBe(accountA.id)
    expect(second.reason).toBe("sticky_session")
  })

  test("ignores expired sticky sessions", () => {
    const state = createAccountSelectorState()
    const config: Partial<ResolvedAccountSelectionConfig> = {
      stickySessionTtlMinutes: 5,
    }
    const first = select({
      config,
      conversationId: "conversation-1",
      now: 1000,
      state,
    })
    const second = select({
      config,
      conversationId: "conversation-1",
      now: 1000 + 5 * 60 * 1000 + 1,
      state,
    })

    expect(first.account.id).toBe(accountA.id)
    expect(second.account.id).toBe(accountB.id)
    expect(second.reason).toBe("least_recently_used")
  })

  test("falls back to least-recently-used for quota aware strategy", () => {
    const state = createAccountSelectorState()
    const result = select({
      config: {
        selectorStrategy: "quota_aware",
      },
      state,
    })

    expect(result.account.id).toBe(accountA.id)
    expect(result.reason).toBe("quota_aware_fallback_least_recently_used")
  })
})
