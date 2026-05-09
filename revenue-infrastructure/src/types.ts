export type Currency = "USD" | "EUR"

export type BillingInterval = "monthly" | "annual"

export type AccountKind = "individual" | "lab" | "institution"

export type PaymentProvider = "stripe" | "paypal" | "institutional_invoice"

export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "past_due"

export type UsageMetric =
  | "ai_tokens"
  | "compute_minutes"
  | "reproducibility_runs"
  | "storage_gb"
  | "licensing_api_calls"

export type RevenueStream =
  | "subscription"
  | "ai_compute"
  | "usage_top_up"
  | "data_licensing"
  | "institutional_services"

export interface Money {
  currency: Currency
  cents: number
}

export interface PlanFeature {
  key: string
  label: string
  included: boolean
}

export interface PlanQuota {
  metric: UsageMetric
  included: number
  overageCents: number
  unitLabel: string
}

export interface PricingPlan {
  id: string
  name: string
  kind: AccountKind
  monthlyBaseCents: number
  annualDiscountPercent: number
  includedSeats: number
  extraSeatCents: number
  trialDays: number
  volumeDiscounts: Array<{
    minSeats: number
    discountPercent: number
  }>
  quotas: PlanQuota[]
  features: PlanFeature[]
}

export interface Coupon {
  code: string
  percentOff: number
  appliesTo: RevenueStream[]
  expiresAt: string
  maxRedemptions: number
  redeemed: number
}

export interface Subscription {
  planId: string
  interval: BillingInterval
  seats: number
  startedAt: string
  trialEndsAt?: string
  couponCode?: string
  paymentProvider: PaymentProvider
}

export interface UsageEvent {
  id: string
  accountId: string
  metric: UsageMetric
  quantity: number
  occurredAt: string
  source: string
  metadata?: Record<string, string | number | boolean>
}

export interface TopUp {
  id: string
  accountId: string
  stream: RevenueStream
  amount: Money
  purchasedAt: string
  consumedCents: number
}

export interface Account {
  id: string
  name: string
  kind: AccountKind
  billingEmail: string
  country: string
  institution?: string
  subscription: Subscription
  usageEvents: UsageEvent[]
  topUps: TopUp[]
}

export interface InvoiceLineItem {
  id: string
  stream: RevenueStream
  description: string
  quantity: number
  unitLabel: string
  unitCents: number
  subtotalCents: number
  discountCents: number
  totalCents: number
}

export interface Invoice {
  id: string
  accountId: string
  provider: PaymentProvider
  status: InvoiceStatus
  currency: Currency
  periodStart: string
  periodEnd: string
  issuedAt: string
  dueAt: string
  lineItems: InvoiceLineItem[]
  subtotalCents: number
  discountCents: number
  creditsAppliedCents: number
  taxCents: number
  totalCents: number
  hostedPaymentUrl?: string
  notes: string[]
}

export interface LicensingContract {
  id: string
  accountId: string
  customerName: string
  product: "citation_graph_api" | "reproducibility_insights" | "trend_dashboard"
  annualFeeCents: number
  apiCallAllowance: number
  startedAt: string
  expiresAt: string
  accessScope: string[]
}

export interface ResearchMetadataEvent {
  id: string
  projectId: string
  domain: string
  method: string
  region: string
  institutionType: "university" | "government" | "private_lab" | "nonprofit"
  reproducibilityScore: number
  citationCount: number
  datasetReuseCount: number
  occurredAt: string
  containsPrivateContent: boolean
}

export interface EntitlementResult {
  allowed: boolean
  feature: string
  reason: string
  remaining?: number
  resetAt?: string
}

export interface RevenueSummary {
  accountId: string
  recurringRevenueCents: number
  usageRevenueCents: number
  licensingRevenueCents: number
  projectedMonthlyRevenueCents: number
  activeStreams: RevenueStream[]
}
