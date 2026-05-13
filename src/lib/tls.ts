import consola from "consola"

function isTruthyEnv(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes"
}

export function initGithubTlsFromEnv(): void {
  if (!isTruthyEnv(process.env.COPILOT_API_INSECURE_TLS)) {
    return
  }

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  consola.warn(
    "GitHub TLS verification is disabled by COPILOT_API_INSECURE_TLS=true. Use this only for local proxy/certificate troubleshooting.",
  )
}
