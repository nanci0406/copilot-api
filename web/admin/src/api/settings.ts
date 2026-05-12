import {
  adminSettingsRequestSchema,
  adminSettingsResponseSchema,
  adminSettingsUpdateResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchAdminSettings() {
  return requestAndParse(adminSettingsResponseSchema, "/settings")
}

export function updateAdminSettings(payload: unknown) {
  return requestAndParse(
    adminSettingsUpdateResponseSchema,
    "/settings",
    jsonRequest(adminSettingsRequestSchema.partial().parse(payload), {
      method: "PUT",
    }),
  )
}
