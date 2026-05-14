import { describe, expect, test } from "bun:test"

import {
  hashAdminSecret,
  validateAdminSecret,
  verifyAdminSecretHash,
} from "../src/lib/admin-auth"
import { DEFAULT_ADMIN_SECRET_HASH } from "../src/lib/config"

describe("admin auth helpers", () => {
  test("hashes and verifies admin secret", async () => {
    const secretHash = await hashAdminSecret("super-secret-value")

    expect(secretHash.startsWith("scrypt$")).toBe(true)
    expect(await verifyAdminSecretHash("super-secret-value", secretHash)).toBe(
      true,
    )
    expect(await verifyAdminSecretHash("wrong-secret", secretHash)).toBe(false)
  })

  test("validates minimum admin secret length", () => {
    expect(validateAdminSecret("short").valid).toBe(false)
    expect(validateAdminSecret("long-enough-secret").valid).toBe(true)
  })

  test("verifies the default admin secret", async () => {
    expect(
      await verifyAdminSecretHash("123456", DEFAULT_ADMIN_SECRET_HASH),
    ).toBe(true)
    expect(
      await verifyAdminSecretHash("wrong-secret", DEFAULT_ADMIN_SECRET_HASH),
    ).toBe(false)
  })
})
