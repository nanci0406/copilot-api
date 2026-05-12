import {
  accountsResponseSchema,
  activateAccountResponseSchema,
  successResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchAccounts() {
  return requestAndParse(accountsResponseSchema, "/accounts")
}

export function reorderAccounts(accountIds: Array<string>) {
  return requestAndParse(
    successResponseSchema,
    "/accounts/reorder",
    jsonRequest(
      {
        accountIds,
      },
      { method: "PUT" },
    ),
  )
}

export function activateAccount(accountId: string) {
  return requestAndParse(
    activateAccountResponseSchema,
    `/accounts/${encodeURIComponent(accountId)}/activate`,
    { method: "POST" },
  )
}

export function deleteAccount(accountId: string) {
  return requestAndParse(
    successResponseSchema,
    `/accounts/${encodeURIComponent(accountId)}`,
    { method: "DELETE" },
  )
}
