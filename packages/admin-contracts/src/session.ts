import { z } from "zod"

import {
  adminSecretSourceSchema,
  isoDateTimeSchema,
  successResponseSchema,
} from "./common"

export const adminAuthStatusSchema = z.object({
  configured: z.boolean(),
  authenticated: z.boolean(),
  requiresSetup: z.boolean(),
  sessionTtlDays: z.number().int().positive(),
  enforceHttps: z.boolean(),
  secretSource: adminSecretSourceSchema,
  secretManagedInApp: z.boolean(),
  expiresAt: isoDateTimeSchema.nullable(),
})

export const adminLoginRequestSchema = z.object({
  secret: z.string().optional(),
})

export const adminLoginResponseSchema = successResponseSchema.extend({
  expiresAt: isoDateTimeSchema.nullable(),
})

export const adminSetupRequestSchema = z.object({
  secret: z.string().optional(),
  confirmSecret: z.string().optional(),
})

export const adminSetupResponseSchema = adminLoginResponseSchema

export type AdminAuthStatus = z.infer<typeof adminAuthStatusSchema>
export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>
export type AdminLoginResponse = z.infer<typeof adminLoginResponseSchema>
export type AdminSetupRequest = z.infer<typeof adminSetupRequestSchema>
export type AdminSetupResponse = z.infer<typeof adminSetupResponseSchema>
