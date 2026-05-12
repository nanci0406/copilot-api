import { z } from "zod"

import { successResponseSchema } from "./common"

export const quotaDetailSchema = z.object({
  entitlement: z.number(),
  overage_count: z.number(),
  overage_permitted: z.boolean(),
  percent_remaining: z.number(),
  quota_id: z.string(),
  quota_remaining: z.number(),
  remaining: z.number(),
  unlimited: z.boolean(),
})

export const usageSummaryResponseSchema = z.object({
  access_type_sku: z.string(),
  analytics_tracking_id: z.string(),
  assigned_date: z.string(),
  can_signup_for_limited: z.boolean(),
  chat_enabled: z.boolean(),
  copilot_plan: z.string(),
  organization_login_list: z.array(z.unknown()),
  organization_list: z.array(z.unknown()),
  quota_reset_date: z.string(),
  quota_snapshots: z.object({
    chat: quotaDetailSchema,
    completions: quotaDetailSchema,
    premium_interactions: quotaDetailSchema,
  }),
})

export const usageLogSourceSchema = z.enum(["all", "request"])
export const usageLogResponseTypeSchema = z.enum(["streaming", "non_streaming"])

export const usageLogEntrySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
  lastSeenAt: z.iso.datetime({ offset: true }),
  monthKey: z.string(),
  source: z.literal("request"),
  accountId: z.string().optional(),
  conversationId: z.string().optional(),
  conversationVariantKey: z.string().optional(),
  endpoint: z.string().optional(),
  responseType: usageLogResponseTypeSchema.optional(),
  statusCode: z.number().int().optional(),
  model: z.string().optional(),
  multiplier: z.number().optional(),
  delta: z.number().optional(),
  quotaDelta: z.number(),
  requestCount: z.number().int().positive(),
  premiumUsed: z.number(),
  premiumRemaining: z.number(),
  premiumEntitlement: z.number(),
  chatUsed: z.number(),
  completionsUsed: z.number(),
})

export const usageLogsPaginationSchema = z.object({
  limit: z.number().int().positive(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  source: usageLogSourceSchema,
  endpoint: z.string().nullable(),
  endpoints: z.array(z.string()),
})

export const usageLogsResponseSchema = z.object({
  logs: z.array(usageLogEntrySchema),
  pagination: usageLogsPaginationSchema,
})

export const clearUsageLogsResponseSchema = successResponseSchema.extend({
  deletedCount: z.number().int().nonnegative(),
  activeAccountId: z.string().nullable(),
})

export const clearAllUsageLogsResponseSchema = successResponseSchema.extend({
  deletedCount: z.number().int().nonnegative(),
})

export type QuotaDetail = z.infer<typeof quotaDetailSchema>
export type UsageSummaryResponse = z.infer<typeof usageSummaryResponseSchema>
export type UsageLogSource = z.infer<typeof usageLogSourceSchema>
export type UsageLogResponseType = z.infer<typeof usageLogResponseTypeSchema>
export type UsageLogEntry = z.infer<typeof usageLogEntrySchema>
export type UsageLogsPagination = z.infer<typeof usageLogsPaginationSchema>
export type UsageLogsResponse = z.infer<typeof usageLogsResponseSchema>
export type ClearUsageLogsResponse = z.infer<
  typeof clearUsageLogsResponseSchema
>
export type ClearAllUsageLogsResponse = z.infer<
  typeof clearAllUsageLogsResponseSchema
>
