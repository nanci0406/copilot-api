import { z } from "zod"

import {
  adminSecretSourceSchema,
  successResponseSchema,
  usageLogCountModeSchema,
} from "./common"

export const settingsContextManagementSchema = z.object({
  enabled: z.boolean(),
  summarizeAtPercent: z.number().min(50).max(95),
  keepRecentTurns: z.number().int().min(1).max(20),
  summarizerModel: z.string().nullable(),
})

export const settingsAdminAuthSchema = z.object({
  configured: z.boolean(),
  secretSource: adminSecretSourceSchema,
  secretManagedInApp: z.boolean(),
  sessionTtlDays: z.number().int().positive(),
  enforceHttps: z.boolean(),
})

export const settingsEnvOverrideSchema = z.object({
  rateLimitSeconds: z.boolean(),
  rateLimitWait: z.boolean(),
})

export const adminSettingsResponseSchema = z.object({
  rateLimitSeconds: z.number().positive().nullable(),
  rateLimitWait: z.boolean(),
  adminSessionTtlDays: z.number().int().positive(),
  usageTestIntervalMinutes: z.number().int().positive().nullable(),
  usageLogCountMode: usageLogCountModeSchema,
  disableHiddenModels: z.boolean(),
  contextManagement: settingsContextManagementSchema,
  hasAnthropicApiKey: z.boolean(),
  hasAuthApiKey: z.boolean(),
  adminAuth: settingsAdminAuthSchema,
  envOverride: settingsEnvOverrideSchema,
})

export const adminSettingsRequestSchema = z.object({
  rateLimitSeconds: z.number().positive().nullable().optional(),
  rateLimitWait: z.boolean().optional(),
  adminSessionTtlDays: z.number().int().positive().nullable().optional(),
  usageTestIntervalMinutes: z.number().int().positive().nullable().optional(),
  usageLogCountMode: usageLogCountModeSchema.optional(),
  disableHiddenModels: z.boolean().optional(),
  contextManagement: z
    .object({
      enabled: z.boolean().optional(),
      summarizeAtPercent: z.number().min(50).max(95).nullable().optional(),
      keepRecentTurns: z.number().int().min(1).max(20).nullable().optional(),
      summarizerModel: z.string().nullable().optional(),
    })
    .optional(),
  anthropicApiKey: z.string().nullable().optional(),
  clearAnthropicApiKey: z.boolean().optional(),
  authApiKey: z.string().nullable().optional(),
  clearAuthApiKey: z.boolean().optional(),
})

export const adminSettingsUpdateResponseSchema = successResponseSchema.extend({
  settings: z.object({
    rateLimitSeconds: z.number().positive().nullable(),
    rateLimitWait: z.boolean(),
    adminSessionTtlDays: z.number().int().positive(),
    usageTestIntervalMinutes: z.number().int().positive().nullable(),
    usageLogCountMode: usageLogCountModeSchema,
    disableHiddenModels: z.boolean(),
    contextManagement: settingsContextManagementSchema,
    hasAnthropicApiKey: z.boolean(),
    hasAuthApiKey: z.boolean(),
  }),
})

export type SettingsContextManagement = z.infer<
  typeof settingsContextManagementSchema
>
export type SettingsAdminAuth = z.infer<typeof settingsAdminAuthSchema>
export type SettingsEnvOverride = z.infer<typeof settingsEnvOverrideSchema>
export type AdminSettingsResponse = z.infer<typeof adminSettingsResponseSchema>
export type AdminSettingsRequest = z.infer<typeof adminSettingsRequestSchema>
export type AdminSettingsUpdateResponse = z.infer<
  typeof adminSettingsUpdateResponseSchema
>
