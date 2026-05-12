import { z } from "zod"

import { accountTypeSchema, successResponseSchema } from "./common"

export const deviceCodeResponseSchema = z.object({
  deviceCode: z.string(),
  userCode: z.string(),
  verificationUri: z.url(),
  expiresIn: z.number().int().positive(),
  interval: z.number().int().positive(),
})

export const pollRequestSchema = z.object({
  deviceCode: z.string(),
  interval: z.number().int().positive(),
  accountType: accountTypeSchema.optional(),
})

export const authAccountSchema = z.object({
  id: z.string(),
  login: z.string(),
  avatarUrl: z.string(),
  accountType: accountTypeSchema,
})

export const pollPendingResponseSchema = z.object({
  pending: z.literal(true),
  slowDown: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
  message: z.string(),
})

export const pollSuccessResponseSchema = successResponseSchema.extend({
  account: authAccountSchema,
})

export const authStatusResponseSchema = z.object({
  authenticated: z.boolean(),
  hasAccounts: z.boolean(),
  activeAccount: authAccountSchema.nullable(),
})

export type DeviceCodeResponse = z.infer<typeof deviceCodeResponseSchema>
export type PollRequest = z.infer<typeof pollRequestSchema>
export type AuthAccount = z.infer<typeof authAccountSchema>
export type PollPendingResponse = z.infer<typeof pollPendingResponseSchema>
export type PollSuccessResponse = z.infer<typeof pollSuccessResponseSchema>
export type AuthStatusResponse = z.infer<typeof authStatusResponseSchema>
