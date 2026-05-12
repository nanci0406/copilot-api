import { describe, expect, test } from "vitest"

import { router } from "./index"

describe("admin router scaffold", () => {
  test("registers auth and protected admin routes", () => {
    const paths = router.getRoutes().map((route) => route.path)

    expect(paths).toContain("/login")
    expect(paths).toContain("/setup")
    expect(paths).toContain("/accounts")
    expect(paths).toContain("/models")
    expect(paths).toContain("/settings")
    expect(paths).toContain("/usage")
    expect(paths).toContain("/model-mappings")
    expect(paths).toContain("/manual")
  })
})
