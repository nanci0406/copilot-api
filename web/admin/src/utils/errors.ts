import { AdminHttpError } from "@/api/client"

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminHttpError) {
    return error.payload?.error.message ?? error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
