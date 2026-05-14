import { describe, expect, test } from "bun:test"

import {
  githubCopilotInternalHeaders,
  githubRestHeaders,
} from "../src/lib/api-config"

describe("GitHub API headers", () => {
  test("keeps REST and Copilot internal API versions separated", () => {
    const restHeaders = githubRestHeaders("github-token")
    const copilotInternalHeaders = githubCopilotInternalHeaders("github-token")

    expect(restHeaders.authorization).toBe("token github-token")
    expect("x-github-api-version" in restHeaders).toBe(false)
    expect(copilotInternalHeaders.authorization).toBe("token github-token")
    expect(copilotInternalHeaders["x-github-api-version"]).toBe("2025-10-01")
  })
})
