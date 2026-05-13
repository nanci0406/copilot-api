export const adminQueryKeys = {
  accountSelection: ["admin", "account-selection"] as const,
  accounts: ["admin", "accounts"] as const,
  authStatus: ["admin", "auth-status"] as const,
  mappings: ["admin", "mappings"] as const,
  models: ["admin", "models"] as const,
  premiumConfig: ["admin", "premium-config"] as const,
  settings: ["admin", "settings"] as const,
  usageSummary: ["admin", "usage-summary"] as const,
  usageLogs: (params: {
    cursor: string | null
    endpoint: string
    limit: number
    source: "all" | "request"
  }) => ["admin", "usage-logs", params] as const,
}
