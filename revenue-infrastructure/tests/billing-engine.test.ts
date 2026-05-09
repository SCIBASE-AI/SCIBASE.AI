import { describe, expect, it } from "vitest"
import { accounts, coupons, pricingPlans } from "../src/data/demo-data.js"
import {
  buildUsageLines,
  generateInvoice,
  previewCoupon,
  usageEventsForPeriod
} from "../src/lib/billing-engine.js"

describe("billing engine", () => {
  it("applies annual and volume discounts to lab subscriptions", () => {
    const account = accounts.find((candidate) => candidate.id === "acct_lab_quantum")
    expect(account).toBeDefined()

    const invoice = generateInvoice(
      { plans: pricingPlans, coupons },
      {
        account: account!,
        periodStart: "2026-05-01T00:00:00.000Z",
        periodEnd: "2026-06-01T00:00:00.000Z",
        issuedAt: "2026-05-09T00:00:00.000Z"
      }
    )

    const subscriptionLine = invoice.lineItems.find((line) => line.stream === "subscription")
    expect(subscriptionLine?.subtotalCents).toBe(5_268_00)
    expect(subscriptionLine?.discountCents).toBeGreaterThan(1_000_00)
    expect(invoice.totalCents).toBeGreaterThan(0)
  })

  it("rates only usage that falls inside the invoice period", () => {
    const account = accounts.find((candidate) => candidate.id === "acct_individual_ada")
    expect(account).toBeDefined()

    const events = usageEventsForPeriod(
      account!.usageEvents,
      "2026-05-01T00:00:00.000Z",
      "2026-06-01T00:00:00.000Z"
    )
    const plan = pricingPlans.find((candidate) => candidate.id === account!.subscription.planId)
    const usageLines = buildUsageLines(plan!, events)

    expect(usageLines.map((line) => line.description)).toContain("ai tokens overage")
    expect(usageLines.map((line) => line.description)).toContain("reproducibility runs overage")
    expect(usageLines.find((line) => line.description === "ai tokens overage")?.quantity).toBe(450)
  })

  it("applies top-up credits before tax", () => {
    const account = accounts.find((candidate) => candidate.id === "acct_individual_ada")
    expect(account).toBeDefined()

    const invoice = generateInvoice(
      { plans: pricingPlans, coupons },
      {
        account: account!,
        periodStart: "2026-05-01T00:00:00.000Z",
        periodEnd: "2026-06-01T00:00:00.000Z",
        issuedAt: "2026-05-09T00:00:00.000Z"
      }
    )

    expect(invoice.creditsAppliedCents).toBeGreaterThan(0)
    expect(invoice.totalCents).toBeLessThan(invoice.subtotalCents + invoice.taxCents)
  })

  it("previews valid coupons without mutating account state", () => {
    const account = accounts.find((candidate) => candidate.id === "acct_lab_quantum")
    expect(account).toBeDefined()

    const preview = previewCoupon(
      { plans: pricingPlans, coupons },
      account!,
      "OPENSCIENCE20",
      "2026-05-09T00:00:00.000Z"
    )

    expect(preview.valid).toBe(true)
    expect(preview.discountCents).toBeGreaterThan(0)
    expect(account!.subscription.couponCode).toBeUndefined()
  })
})
