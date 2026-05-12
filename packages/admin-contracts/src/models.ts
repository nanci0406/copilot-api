import { z } from "zod"

import { reasoningEffortSchema, successResponseSchema } from "./common"

export const modelCardMetadataSchema = z.object({
  contextWindowTokens: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
})

export const premiumModelConfigSnapshotSchema = z.object({
  multipliers: z.record(z.string(), z.number()),
  modelCardMetadata: z.record(z.string(), modelCardMetadataSchema),
  hiddenModels: z.array(z.string()),
  reasoningEfforts: z.record(z.string(), reasoningEffortSchema),
  modelSupportedReasoningEfforts: z.record(z.string(), z.array(z.string())),
})

export const premiumMultiplierRequestSchema = z.object({
  multiplier: z.number().min(0),
})

export const premiumMultiplierResponseSchema = successResponseSchema.extend({
  model: z.string(),
  multiplier: z.number().min(0),
})

export const deletePremiumMultiplierResponseSchema =
  successResponseSchema.extend({
    model: z.string(),
  })

export const reasoningEffortRequestSchema = z.object({
  effort: reasoningEffortSchema,
})

export const reasoningEffortResponseSchema = successResponseSchema.extend({
  model: z.string(),
  effort: reasoningEffortSchema,
})

export const modelVisibilityRequestSchema = z.object({
  hidden: z.boolean(),
})

export const modelVisibilityResponseSchema = successResponseSchema.extend({
  model: z.string(),
  hidden: z.boolean(),
  hiddenModels: z.array(z.string()),
})

export const adminModelListItemSchema = z.object({
  id: z.string(),
  object: z.literal("model"),
  type: z.literal("model"),
  created: z.number().int().nonnegative(),
  created_at: z.iso.datetime({ offset: true }),
  owned_by: z.string(),
  display_name: z.string(),
})

export const adminModelsResponseSchema = z.object({
  object: z.literal("list"),
  data: z.array(adminModelListItemSchema),
  has_more: z.boolean(),
})

export type ModelCardMetadata = z.infer<typeof modelCardMetadataSchema>
export type PremiumModelConfigSnapshot = z.infer<
  typeof premiumModelConfigSnapshotSchema
>
export type PremiumMultiplierRequest = z.infer<
  typeof premiumMultiplierRequestSchema
>
export type PremiumMultiplierResponse = z.infer<
  typeof premiumMultiplierResponseSchema
>
export type DeletePremiumMultiplierResponse = z.infer<
  typeof deletePremiumMultiplierResponseSchema
>
export type ReasoningEffortRequest = z.infer<
  typeof reasoningEffortRequestSchema
>
export type ReasoningEffortResponse = z.infer<
  typeof reasoningEffortResponseSchema
>
export type ModelVisibilityRequest = z.infer<
  typeof modelVisibilityRequestSchema
>
export type ModelVisibilityResponse = z.infer<
  typeof modelVisibilityResponseSchema
>
export type AdminModelListItem = z.infer<typeof adminModelListItemSchema>
export type AdminModelsResponse = z.infer<typeof adminModelsResponseSchema>
