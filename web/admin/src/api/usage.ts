import {
  clearAllUsageLogsResponseSchema,
  clearUsageLogsResponseSchema,
  usageLogsResponseSchema,
  usageSummaryResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchUsageSummary() {
  return requestAndParse(usageSummaryResponseSchema, "/usage-summary")
}

export function fetchUsageLogs(params: {
  cursor?: string | null
  endpoint?: string
  limit: number
  source: "all" | "request"
}) {
  const search = new URLSearchParams()
  search.set("limit", String(params.limit))
  search.set("source", params.source)

  if (typeof params.endpoint === "string" && params.endpoint.trim()) {
    search.set("endpoint", params.endpoint.trim())
  }

  if (params.cursor) {
    search.set("cursor", params.cursor)
  }

  return requestAndParse(
    usageLogsResponseSchema,
    `/usage-logs?${search.toString()}`,
  )
}

export function clearUsageLogs() {
  return requestAndParse(
    clearUsageLogsResponseSchema,
    "/usage-logs/clear",
    jsonRequest({}, { method: "POST" }),
  )
}

export function clearAllUsageLogs() {
  return requestAndParse(
    clearAllUsageLogsResponseSchema,
    "/usage-logs/clear-all",
    jsonRequest({}, { method: "POST" }),
  )
}
