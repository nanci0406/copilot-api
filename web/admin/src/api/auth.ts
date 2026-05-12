import {
  authStatusResponseSchema,
  deviceCodeResponseSchema,
  pollPendingResponseSchema,
  pollSuccessResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse, requestJson } from "./client"

export function fetchAuthStatus() {
  return requestAndParse(authStatusResponseSchema, "/auth/status")
}

export function startDeviceCodeFlow(accountType: string) {
  return requestAndParse(
    deviceCodeResponseSchema,
    "/auth/device-code",
    jsonRequest(
      {
        accountType,
      },
      { method: "POST" },
    ),
  )
}

export async function pollDeviceCode(
  deviceCode: string,
  accountType: string,
): Promise<
  | ReturnType<typeof pollPendingResponseSchema.parse>
  | ReturnType<typeof pollSuccessResponseSchema.parse>
> {
  const payload = await requestJson<unknown>(
    "/auth/poll",
    jsonRequest(
      {
        deviceCode,
        accountType,
      },
      { method: "POST" },
    ),
  )

  if (
    payload
    && typeof payload === "object"
    && "success" in payload
    && payload.success === true
  ) {
    return pollSuccessResponseSchema.parse(payload)
  }

  return pollPendingResponseSchema.parse(payload)
}
