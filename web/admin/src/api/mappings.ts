import {
  modelMappingsResponseSchema,
  successResponseSchema,
  updateModelMappingResponseSchema,
} from "@copilot-api/admin-contracts"

import { jsonRequest, requestAndParse } from "./client"

export function fetchModelMappings() {
  return requestAndParse(modelMappingsResponseSchema, "/model-mappings")
}

export function saveModelMapping(from: string, to: string) {
  return requestAndParse(
    updateModelMappingResponseSchema,
    `/model-mappings/${encodeURIComponent(from)}`,
    jsonRequest(
      {
        to,
      },
      { method: "PUT" },
    ),
  )
}

export function deleteModelMapping(from: string) {
  return requestAndParse(
    successResponseSchema,
    `/model-mappings/${encodeURIComponent(from)}`,
    { method: "DELETE" },
  )
}
