import { describe, expect, it } from "vitest"
import {
  accounts,
  coupons,
  licensingContracts,
  pricingPlans,
  researchMetadataEvents
} from "../src/data/demo-data.js"
import { RevenueService } from "../src/lib/revenue-service.js"

function createService() {
  return new RevenueService({
    plans: structuredClone(pricingPlans),
    coupons: structuredClone(coupons),
    accounts: structuredClone(accounts),
    licensingContracts: structuredClone(licensingContracts),
    researchMetadataEvents: structuredClone(researchMetadataEvents)
  })
}

describe("revenue service", () => {
  it("checks plan entitlements and quota remaining", () => {
    const service = createService()

    const allowed = service.checkEntitlement({
      accountId: "acct_lab_quantum",
      feature: "group_permissions",
      metric: "compute_minutes",
      requestedQuantity: 10,
      periodStart: "2026-05-01T00:00:00.000Z",
      periodEnd: "2026-06-01T00:00:00.000Z"
    })
    expect(allowed.allowed).toBe(false)
    expect(allowed.reason).toContain("overage billing")

    const denied = service.checkEntitlement({
      accountId: "acct_individual_ada",
      feature: "group_permissions",
      periodStart: "2026-05-01T00:00:00.000Z",
      periodEnd: "2026-06-01T00:00:00.000Z"
    })
    expect(denied.allowed).toBe(false)
    expect(denied.reason).toContain("does not include")
  })

  it("records usage events and includes them in the next invoice", () => {
    const service = createService()

    service.recordUsage({
      accountId: "acct_individual_ada",
      metric: "compute_minutes",
      quantity: 999,
      occurredAt: "2026-05-10T00:00:00.000Z",
      source: "test-runner"
    })

    const invoice = service.generateInvoice({
      accountId: "acct_individual_ada",
      periodStart: "2026-05-01T00:00:00.000Z",
      periodEnd: "2026-06-01T00:00:00.000Z"
    })

    expect(invoice.lineItems.some((line) => line.description === "compute minutes overage")).toBe(true)
  })

  it("summarizes platform revenue across subscription, usage, and licensing streams", () => {
    const service = createService()

    const summary = service.platformRevenueSummary()

    expect(summary.subscriptionMrr).toBeGreaterThan(0)
    expect(summary.usageMrr).toBeGreaterThan(0)
    expect(summary.licensingArr).toBe(2_750_000)
    expect(summary.accounts).toHaveLength(3)
  })
})
