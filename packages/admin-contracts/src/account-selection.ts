import { z } from "zod"

import { accountSummarySchema } from "./accounts"
import { successResponseSchema } from "./common"

export const accountSelectionModeSchema = z.enum([
  "active_only",
  "account_pool",
])

export const accountPoolScopeSchema = z.enum([
  "all_accounts",
  "selected_accounts",
])

export const accountSelectorStrategySchema = z.enum([
  "least_recently_used",
  "round_robin",
  "quota_aware",
])

export const accountSelectionSchema = z.object({
  mode: accountSelectionModeSchema,
  poolScope: accountPoolScopeSchema,
  selectedAccountIds: z.array(z.string()),
  stickySessions: z.boolean(),
  stickySessionTtlMinutes: z.number().int().min(5).max(10_080),
  failoverOnRequestError: z.boolean(),
  selectorStrategy: accountSelectorStrategySchema,
})

export const accountSelectionUpdateRequestSchema = z.object({
  mode: accountSelectionModeSchema.optional(),
  poolScope: accountPoolScopeSchema.optional(),
  selectedAccountIds: z.array(z.string()).optional(),
  stickySessions: z.boolean().optional(),
  stickySessionTtlMinutes: z.number().int().min(5).max(10_080).optional(),
  failoverOnRequestError: z.boolean().optional(),
  selectorStrategy: accountSelectorStrategySchema.optional(),
})

export const accountSelectionAccountSchema = accountSummarySchema.extend({
  isActive: z.boolean(),
})

export const accountSelectionResponseSchema = z.object({
  accountSelection: accountSelectionSchema,
  accounts: z.array(accountSelectionAccountSchema),
})

export const accountSelectionUpdateResponseSchema =
  successResponseSchema.extend({
    accountSelection: accountSelectionSchema,
    accounts: z.array(accountSelectionAccountSchema),
  })

export type AccountSelectionMode = z.infer<typeof accountSelectionModeSchema>
export type AccountPoolScope = z.infer<typeof accountPoolScopeSchema>
export type AccountSelectorStrategy = z.infer<
  typeof accountSelectorStrategySchema
>
export type AccountSelection = z.infer<typeof accountSelectionSchema>
export type AccountSelectionUpdateRequest = z.infer<
  typeof accountSelectionUpdateRequestSchema
>
export type AccountSelectionAccount = z.infer<
  typeof accountSelectionAccountSchema
>
export type AccountSelectionResponse = z.infer<
  typeof accountSelectionResponseSchema
>
export type AccountSelectionUpdateResponse = z.infer<
  typeof accountSelectionUpdateResponseSchema
>
