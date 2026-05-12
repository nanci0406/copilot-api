import {
  adminAuthStatusSchema,
  adminLoginResponseSchema,
  adminSetupResponseSchema,
  successResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchAdminSession() {
  return requestAndParse(adminAuthStatusSchema, "/session")
}

export function loginAdmin(secret: string) {
  return requestAndParse(
    adminLoginResponseSchema,
    "/session/login",
    jsonRequest(
      {
        secret,
      },
      { method: "POST" },
    ),
  )
}

export function setupAdmin(secret: string, confirmSecret: string) {
  return requestAndParse(
    adminSetupResponseSchema,
    "/setup",
    jsonRequest(
      {
        secret,
        confirmSecret,
      },
      { method: "POST" },
    ),
  )
}

export function logoutAdmin() {
  return requestAndParse(
    successResponseSchema,
    "/session/logout",
    jsonRequest({}, { method: "POST" }),
  )
}
