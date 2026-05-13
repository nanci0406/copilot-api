export type AdminApiRouteMethod = "GET" | "POST" | "PUT" | "DELETE"
export type AdminApiRouteAccess = "public" | "protected"
export type AdminApiEvolutionStrategy = "retain" | "reshape" | "adapt"
export type AdminApiDomain =
  | "session"
  | "setup"
  | "accounts"
  | "account-selection"
  | "auth"
  | "usage"
  | "mappings"
  | "models"
  | "settings"

export interface AdminApiRouteDefinition {
  method: AdminApiRouteMethod
  path: string
  access: AdminApiRouteAccess
  domain: AdminApiDomain
  strategy: AdminApiEvolutionStrategy
}

export const adminApiRouteManifest = [
  {
    method: "GET",
    path: "/api/session",
    access: "public",
    domain: "session",
    strategy: "retain",
  },
  {
    method: "POST",
    path: "/api/session/login",
    access: "public",
    domain: "session",
    strategy: "retain",
  },
  {
    method: "POST",
    path: "/api/session/logout",
    access: "protected",
    domain: "session",
    strategy: "retain",
  },
  {
    method: "POST",
    path: "/api/setup",
    access: "public",
    domain: "setup",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/accounts",
    access: "protected",
    domain: "accounts",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/accounts/active",
    access: "protected",
    domain: "accounts",
    strategy: "adapt",
  },
  {
    method: "PUT",
    path: "/api/accounts/reorder",
    access: "protected",
    domain: "accounts",
    strategy: "retain",
  },
  {
    method: "POST",
    path: "/api/accounts/:id/activate",
    access: "protected",
    domain: "accounts",
    strategy: "retain",
  },
  {
    method: "DELETE",
    path: "/api/accounts/:id",
    access: "protected",
    domain: "accounts",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/account-selection",
    access: "protected",
    domain: "account-selection",
    strategy: "reshape",
  },
  {
    method: "PUT",
    path: "/api/account-selection",
    access: "protected",
    domain: "account-selection",
    strategy: "reshape",
  },
  {
    method: "POST",
    path: "/api/auth/device-code",
    access: "protected",
    domain: "auth",
    strategy: "reshape",
  },
  {
    method: "POST",
    path: "/api/auth/poll",
    access: "protected",
    domain: "auth",
    strategy: "reshape",
  },
  {
    method: "GET",
    path: "/api/auth/status",
    access: "protected",
    domain: "auth",
    strategy: "adapt",
  },
  {
    method: "GET",
    path: "/api/usage-logs",
    access: "protected",
    domain: "usage",
    strategy: "reshape",
  },
  {
    method: "POST",
    path: "/api/usage-logs/clear",
    access: "protected",
    domain: "usage",
    strategy: "retain",
  },
  {
    method: "POST",
    path: "/api/usage-logs/clear-all",
    access: "protected",
    domain: "usage",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/model-mappings",
    access: "protected",
    domain: "mappings",
    strategy: "retain",
  },
  {
    method: "PUT",
    path: "/api/model-mappings/:from",
    access: "protected",
    domain: "mappings",
    strategy: "retain",
  },
  {
    method: "DELETE",
    path: "/api/model-mappings/:from",
    access: "protected",
    domain: "mappings",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/premium-multipliers",
    access: "protected",
    domain: "models",
    strategy: "adapt",
  },
  {
    method: "PUT",
    path: "/api/premium-multipliers/:model",
    access: "protected",
    domain: "models",
    strategy: "retain",
  },
  {
    method: "DELETE",
    path: "/api/premium-multipliers/:model",
    access: "protected",
    domain: "models",
    strategy: "retain",
  },
  {
    method: "PUT",
    path: "/api/reasoning-efforts/:model",
    access: "protected",
    domain: "models",
    strategy: "retain",
  },
  {
    method: "PUT",
    path: "/api/model-visibility/:model",
    access: "protected",
    domain: "models",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/models",
    access: "protected",
    domain: "models",
    strategy: "adapt",
  },
  {
    method: "GET",
    path: "/api/settings",
    access: "protected",
    domain: "settings",
    strategy: "retain",
  },
  {
    method: "PUT",
    path: "/api/settings",
    access: "protected",
    domain: "settings",
    strategy: "retain",
  },
  {
    method: "GET",
    path: "/api/usage-summary",
    access: "protected",
    domain: "usage",
    strategy: "adapt",
  },
] as const satisfies ReadonlyArray<AdminApiRouteDefinition>

export const publicAdminApiPaths = adminApiRouteManifest
  .filter((route) => route.access === "public")
  .map((route) => route.path)

export const protectedAdminApiPaths = adminApiRouteManifest
  .filter((route) => route.access === "protected")
  .map((route) => route.path)

export type AdminApiPath = (typeof adminApiRouteManifest)[number]["path"]
