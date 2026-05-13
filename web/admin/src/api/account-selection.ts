import {
  accountSelectionResponseSchema,
  accountSelectionUpdateRequestSchema,
  accountSelectionUpdateResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchAccountSelection() {
  return requestAndParse(accountSelectionResponseSchema, "/account-selection")
}

export function updateAccountSelection(payload: unknown) {
  return requestAndParse(
    accountSelectionUpdateResponseSchema,
    "/account-selection",
    jsonRequest(accountSelectionUpdateRequestSchema.parse(payload), {
      method: "PUT",
    }),
  )
}
