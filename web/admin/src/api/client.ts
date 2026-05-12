import type { AdminApiError } from "@copilot-api/admin-contracts"
import type { ZodType } from "zod"

export const ADMIN_UI_BASE = "/admin"
export const ADMIN_API_BASE = "/admin/api"

export class AdminHttpError extends Error {
  status: number
  payload: AdminApiError | null

  constructor(status: number, payload: AdminApiError | null) {
    super(
      payload?.error.message ?? `Admin request failed with status ${status}`,
    )
    this.name = "AdminHttpError"
    this.status = status
    this.payload = payload
  }
}

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers)
  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    credentials: "same-origin",
    ...init,
    headers,
  })

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new AdminHttpError(response.status, payload as AdminApiError | null)
  }

  return payload as T
}

export async function requestAndParse<T>(
  schema: ZodType<T>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  return schema.parse(await requestJson<unknown>(path, init))
}

export function jsonRequest(body: unknown, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers)
  headers.set("content-type", "application/json")

  return {
    ...init,
    headers,
    body: JSON.stringify(body),
  }
}
