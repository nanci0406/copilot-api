import { z } from "zod"

import { successResponseSchema } from "./common"

export const modelMappingsResponseSchema = z.object({
  modelMapping: z.record(z.string(), z.string()),
})

export const updateModelMappingRequestSchema = z.object({
  to: z.string(),
})

export const updateModelMappingResponseSchema = successResponseSchema.extend({
  from: z.string(),
  to: z.string(),
})

export const deleteModelMappingResponseSchema = successResponseSchema

export type ModelMappingsResponse = z.infer<typeof modelMappingsResponseSchema>
export type UpdateModelMappingRequest = z.infer<
  typeof updateModelMappingRequestSchema
>
export type UpdateModelMappingResponse = z.infer<
  typeof updateModelMappingResponseSchema
>
export type DeleteModelMappingResponse = z.infer<
  typeof deleteModelMappingResponseSchema
>
