import { z } from "zod"

import {
  accountTypeSchema,
  isoDateTimeSchema,
  successResponseSchema,
} from "./common"

export const accountUsageSuccessSchema = z.object({
  status: z.literal("ok"),
  premiumPercent: z.number(),
  chatPercent: z.number(),
  completionsPercent: z.number(),
  premiumUnlimited: z.boolean(),
  chatUnlimited: z.boolean(),
  completionsUnlimited: z.boolean(),
})

export const accountUsageErrorSchema = z.object({
  status: z.literal("error"),
})

export const accountUsageSchema = z.union([
  accountUsageSuccessSchema,
  accountUsageErrorSchema,
])

export const accountSummarySchema = z.object({
  id: z.string(),
  login: z.string(),
  avatarUrl: z.string(),
  accountType: accountTypeSchema,
  createdAt: isoDateTimeSchema,
})

export const activeAccountSchema = accountSummarySchema.omit({
  createdAt: true,
})

export const accountListItemSchema = accountSummarySchema.extend({
  isActive: z.boolean(),
  usage: accountUsageSchema,
})

export const accountsResponseSchema = z.object({
  activeAccountId: z.string().nullable(),
  accounts: z.array(accountListItemSchema),
})

export const activeAccountResponseSchema = z.object({
  account: accountSummarySchema.nullable(),
})

export const reorderAccountsRequestSchema = z.object({
  accountIds: z.array(z.string()),
})

export const activateAccountResponseSchema = successResponseSchema.extend({
  account: activeAccountSchema,
})

export const deleteAccountResponseSchema = successResponseSchema

export type AccountUsage = z.infer<typeof accountUsageSchema>
export type AccountSummary = z.infer<typeof accountSummarySchema>
export type ActiveAccount = z.infer<typeof activeAccountSchema>
export type AccountListItem = z.infer<typeof accountListItemSchema>
export type AccountsResponse = z.infer<typeof accountsResponseSchema>
export type ActiveAccountResponse = z.infer<typeof activeAccountResponseSchema>
export type ReorderAccountsRequest = z.infer<
  typeof reorderAccountsRequestSchema
>
export type ActivateAccountResponse = z.infer<
  typeof activateAccountResponseSchema
>
export type DeleteAccountResponse = z.infer<typeof deleteAccountResponseSchema>
