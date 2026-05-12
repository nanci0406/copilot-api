import { z } from "zod"

export const accountTypeSchema = z.enum([
  "individual",
  "business",
  "enterprise",
])

export const reasoningEffortSchema = z.enum([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
])

export const usageLogCountModeSchema = z.enum(["request", "conversation"])

export const adminSecretSourceSchema = z.enum([
  "none",
  "env-hash",
  "env-secret",
  "config-hash",
])

export const adminApiErrorSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string(),
  }),
})

export const successResponseSchema = z.object({
  success: z.literal(true),
})

export const isoDateTimeSchema = z.iso.datetime({ offset: true })

export type AccountType = z.infer<typeof accountTypeSchema>
export type ReasoningEffort = z.infer<typeof reasoningEffortSchema>
export type UsageLogCountMode = z.infer<typeof usageLogCountModeSchema>
export type AdminSecretSource = z.infer<typeof adminSecretSourceSchema>
export type AdminApiError = z.infer<typeof adminApiErrorSchema>
export type SuccessResponse = z.infer<typeof successResponseSchema>
