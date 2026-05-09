import type {
  Account,
  BillingInterval,
  Coupon,
  Invoice,
  InvoiceLineItem,
  PaymentProvider,
  PricingPlan,
  RevenueStream,
  Subscription,
  TopUp,
  UsageEvent,
  UsageMetric
} from "../types.js"
import { applyPercentDiscount, clampCents } from "./money.js"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export class BillingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BillingError"
  }
}

export interface BillingCatalog {
  plans: PricingPlan[]
  coupons: Coupon[]
}

export interface InvoiceRequest {
  account: Account
  periodStart: string
  periodEnd: string
  issuedAt?: string
  existingInvoiceIds?: string[]
}

export function findPlan(plans: PricingPlan[], planId: string): PricingPlan {
  const plan = plans.find((candidate) => candidate.id === planId)
  if (!plan) {
    throw new BillingError(`Unknown plan: ${planId}`)
  }
  return plan
}

export function findCoupon(coupons: Coupon[], code?: string): Coupon | undefined {
  if (!code) return undefined
  const coupon = coupons.find((candidate) => candidate.code.toLowerCase() === code.toLowerCase())
  if (!coupon) return undefined
  if (coupon.redeemed >= coupon.maxRedemptions) return undefined
  if (new Date(coupon.expiresAt).getTime() < Date.now()) return undefined
  return coupon
}

export function isSubscriptionInTrial(subscription: Subscription, issuedAt: string): boolean {
  if (!subscription.trialEndsAt) return false
  return new Date(subscription.trialEndsAt).getTime() > new Date(issuedAt).getTime()
}

export function subscriptionMonths(interval: BillingInterval): number {
  return interval === "annual" ? 12 : 1
}

export function calculateSeatSubtotal(plan: PricingPlan, seats: number): number {
  const extraSeats = Math.max(0, seats - plan.includedSeats)
  return plan.monthlyBaseCents + extraSeats * plan.extraSeatCents
}

export function bestVolumeDiscountPercent(plan: PricingPlan, seats: number): number {
  return plan.volumeDiscounts
    .filter((discount) => seats >= discount.minSeats)
    .reduce((best, discount) => Math.max(best, discount.discountPercent), 0)
}

export function buildSubscriptionLine(
  account: Account,
  plan: PricingPlan,
  coupon: Coupon | undefined,
  issuedAt: string
): InvoiceLineItem {
  const months = subscriptionMonths(account.subscription.interval)
  const monthlySeatSubtotal = calculateSeatSubtotal(plan, account.subscription.seats)
  const intervalSubtotal = monthlySeatSubtotal * months
  const annualDiscount = account.subscription.interval === "annual"
    ? applyPercentDiscount(intervalSubtotal, plan.annualDiscountPercent)
    : 0
  const volumeDiscount = applyPercentDiscount(intervalSubtotal - annualDiscount, bestVolumeDiscountPercent(plan, account.subscription.seats))
  const couponDiscount = coupon?.appliesTo.includes("subscription")
    ? applyPercentDiscount(intervalSubtotal - annualDiscount - volumeDiscount, coupon.percentOff)
    : 0
  const trialDiscount = isSubscriptionInTrial(account.subscription, issuedAt)
    ? intervalSubtotal - annualDiscount - volumeDiscount - couponDiscount
    : 0
  const discountCents = annualDiscount + volumeDiscount + couponDiscount + trialDiscount

  return {
    id: `line_${account.id}_subscription`,
    stream: "subscription",
    description: `${plan.name} ${account.subscription.interval} subscription (${account.subscription.seats} seats)`,
    quantity: months,
    unitLabel: "month",
    unitCents: monthlySeatSubtotal,
    subtotalCents: intervalSubtotal,
    discountCents,
    totalCents: clampCents(intervalSubtotal - discountCents)
  }
}

export function usageEventsForPeriod(events: UsageEvent[], periodStart: string, periodEnd: string): UsageEvent[] {
  const start = new Date(periodStart).getTime()
  const end = new Date(periodEnd).getTime()
  return events.filter((event) => {
    const time = new Date(event.occurredAt).getTime()
    return time >= start && time < end
  })
}

export function aggregateUsage(events: UsageEvent[]): Map<UsageMetric, number> {
  return events.reduce((totals, event) => {
    totals.set(event.metric, (totals.get(event.metric) ?? 0) + event.quantity)
    return totals
  }, new Map<UsageMetric, number>())
}

export function buildUsageLines(plan: PricingPlan, events: UsageEvent[]): InvoiceLineItem[] {
  const usage = aggregateUsage(events)

  return plan.quotas.flatMap((quota) => {
    const quantity = usage.get(quota.metric) ?? 0
    const overageQuantity = Math.max(0, quantity - quota.included)
    if (overageQuantity === 0) return []

    const billableUnits = quota.metric === "ai_tokens"
      ? Math.ceil(overageQuantity / 1000)
      : quota.metric === "licensing_api_calls"
        ? Math.ceil(overageQuantity / 100)
        : overageQuantity

    const subtotal = billableUnits * quota.overageCents
    const stream: RevenueStream = quota.metric === "licensing_api_calls" ? "data_licensing" : "ai_compute"

    return [{
      id: `line_usage_${quota.metric}`,
      stream,
      description: `${quota.metric.replaceAll("_", " ")} overage`,
      quantity: billableUnits,
      unitLabel: quota.unitLabel,
      unitCents: quota.overageCents,
      subtotalCents: subtotal,
      discountCents: 0,
      totalCents: subtotal
    }]
  })
}

export function availableTopUpCredits(topUps: TopUp[], stream?: RevenueStream): number {
  return topUps
    .filter((topUp) => !stream || topUp.stream === stream)
    .reduce((total, topUp) => total + Math.max(0, topUp.amount.cents - topUp.consumedCents), 0)
}

export function applyTopUpCredits(lineItems: InvoiceLineItem[], topUps: TopUp[]): number {
  const creditEligibleTotal = lineItems
    .filter((line) => line.stream === "ai_compute" || line.stream === "data_licensing")
    .reduce((sum, line) => sum + line.totalCents, 0)
  const credits = availableTopUpCredits(topUps)
  return Math.min(creditEligibleTotal, credits)
}

export function calculateTaxCents(account: Account, taxableCents: number): number {
  if (taxableCents === 0) return 0
  if (account.country === "US") return clampCents(taxableCents * 0.0825)
  if (["DE", "FR", "BE", "NL", "ES", "IT"].includes(account.country)) {
    return clampCents(taxableCents * 0.19)
  }
  return 0
}

export function deterministicInvoiceId(accountId: string, periodStart: string, provider: PaymentProvider): string {
  const compactDate = periodStart.slice(0, 10).replaceAll("-", "")
  return `inv_${accountId}_${compactDate}_${provider}`
}

export function generateInvoice(catalog: BillingCatalog, request: InvoiceRequest): Invoice {
  const issuedAt = request.issuedAt ?? new Date().toISOString()
  const plan = findPlan(catalog.plans, request.account.subscription.planId)
  const coupon = findCoupon(catalog.coupons, request.account.subscription.couponCode)
  const subscriptionLine = buildSubscriptionLine(request.account, plan, coupon, issuedAt)
  const usageEvents = usageEventsForPeriod(request.account.usageEvents, request.periodStart, request.periodEnd)
  const usageLines = buildUsageLines(plan, usageEvents)
  const lineItems = [subscriptionLine, ...usageLines]
  const subtotalCents = lineItems.reduce((sum, line) => sum + line.subtotalCents, 0)
  const discountCents = lineItems.reduce((sum, line) => sum + line.discountCents, 0)
  const creditsAppliedCents = applyTopUpCredits(lineItems, request.account.topUps)
  const taxableCents = clampCents(lineItems.reduce((sum, line) => sum + line.totalCents, 0) - creditsAppliedCents)
  const taxCents = calculateTaxCents(request.account, taxableCents)
  const totalCents = taxableCents + taxCents
  const id = deterministicInvoiceId(request.account.id, request.periodStart, request.account.subscription.paymentProvider)

  return {
    id,
    accountId: request.account.id,
    provider: request.account.subscription.paymentProvider,
    status: request.existingInvoiceIds?.includes(id) ? "open" : "draft",
    currency: "USD",
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    issuedAt,
    dueAt: new Date(new Date(issuedAt).getTime() + 30 * MS_PER_DAY).toISOString(),
    lineItems,
    subtotalCents,
    discountCents,
    creditsAppliedCents,
    taxCents,
    totalCents,
    hostedPaymentUrl: request.account.subscription.paymentProvider === "institutional_invoice"
      ? undefined
      : `https://billing.scibase.ai/pay/${id}`,
    notes: [
      "Usage overages are rated after plan allowances.",
      "Top-up credits apply to AI compute and licensing overage lines before tax.",
      request.account.subscription.paymentProvider === "institutional_invoice"
        ? "Institutional invoice requires procurement approval before due date."
        : "Hosted payment URL can be handed to Stripe or PayPal adapter in production."
    ]
  }
}

export function previewCoupon(catalog: BillingCatalog, account: Account, code: string, issuedAt = new Date().toISOString()) {
  const plan = findPlan(catalog.plans, account.subscription.planId)
  const coupon = findCoupon(catalog.coupons, code)
  if (!coupon) {
    return { valid: false, discountCents: 0, reason: "Coupon is unknown, expired, or exhausted." }
  }
  const withoutCoupon = buildSubscriptionLine(account, plan, undefined, issuedAt)
  const withCoupon = buildSubscriptionLine(
    { ...account, subscription: { ...account.subscription, couponCode: code } },
    plan,
    coupon,
    issuedAt
  )
  return {
    valid: true,
    discountCents: withCoupon.discountCents - withoutCoupon.discountCents,
    reason: `${coupon.percentOff}% discount applies to ${coupon.appliesTo.join(", ")}.`
  }
}
