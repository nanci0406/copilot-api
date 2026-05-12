import {
  adminModelsResponseSchema,
  deletePremiumMultiplierResponseSchema,
  modelVisibilityResponseSchema,
  premiumModelConfigSnapshotSchema,
  premiumMultiplierResponseSchema,
  reasoningEffortResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchAdminModels() {
  return requestAndParse(adminModelsResponseSchema, "/models")
}

export function fetchPremiumConfig() {
  return requestAndParse(
    premiumModelConfigSnapshotSchema,
    "/premium-multipliers",
  )
}

export function savePremiumMultiplier(modelId: string, multiplier: number) {
  return requestAndParse(
    premiumMultiplierResponseSchema,
    `/premium-multipliers/${encodeURIComponent(modelId)}`,
    jsonRequest(
      {
        multiplier,
      },
      { method: "PUT" },
    ),
  )
}

export function deletePremiumMultiplier(modelId: string) {
  return requestAndParse(
    deletePremiumMultiplierResponseSchema,
    `/premium-multipliers/${encodeURIComponent(modelId)}`,
    { method: "DELETE" },
  )
}

export function saveReasoningEffort(modelId: string, effort: string) {
  return requestAndParse(
    reasoningEffortResponseSchema,
    `/reasoning-efforts/${encodeURIComponent(modelId)}`,
    jsonRequest(
      {
        effort,
      },
      { method: "PUT" },
    ),
  )
}

export function saveModelVisibility(modelId: string, hidden: boolean) {
  return requestAndParse(
    modelVisibilityResponseSchema,
    `/model-visibility/${encodeURIComponent(modelId)}`,
    jsonRequest(
      {
        hidden,
      },
      { method: "PUT" },
    ),
  )
}
