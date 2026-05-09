import type {
  Account,
  EntitlementResult,
  LicensingContract,
  PricingPlan,
  ResearchMetadataEvent,
  RevenueStream,
  RevenueSummary,
  TopUp,
  UsageEvent,
  UsageMetric
} from "../types.js"
import { generateInvoice, type BillingCatalog, findPlan, usageEventsForPeriod } from "./billing-engine.js"
import { activeContractsForAccount, buildLicensingExport, licenseAnnualRunRate } from "./licensing-engine.js"

export interface RevenueStore {
  plans: PricingPlan[]
  coupons: BillingCatalog["coupons"]
  accounts: Account[]
  licensingContracts: LicensingContract[]
  researchMetadataEvents: ResearchMetadataEvent[]
}

export interface GenerateInvoiceInput {
  accountId: string
  periodStart: string
  periodEnd: string
}

export interface EntitlementInput {
  accountId: string
  feature: string
  metric?: UsageMetric
  requestedQuantity?: number
  periodStart: string
  periodEnd: string
}

export class RevenueService {
  constructor(private readonly store: RevenueStore) {}

  listPlans() {
    return this.store.plans
  }

  listAccounts() {
    return this.store.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      kind: account.kind,
      country: account.country,
      institution: account.institution,
      subscription: account.subscription
    }))
  }

  getAccount(accountId: string): Account {
    const account = this.store.accounts.find((candidate) => candidate.id === accountId)
    if (!account) {
      throw new Error(`Unknown account: ${accountId}`)
    }
    return account
  }

  generateInvoice(input: GenerateInvoiceInput) {
    const account = this.getAccount(input.accountId)
    return generateInvoice(
      { plans: this.store.plans, coupons: this.store.coupons },
      { account, periodStart: input.periodStart, periodEnd: input.periodEnd }
    )
  }

  recordUsage(event: Omit<UsageEvent, "id"> & { id?: string }) {
    const account = this.getAccount(event.accountId)
    const usageEvent: UsageEvent = {
      id: event.id ?? `use_${event.accountId}_${Date.now()}`,
      accountId: event.accountId,
      metric: event.metric,
      quantity: event.quantity,
      occurredAt: event.occurredAt,
      source: event.source,
      metadata: event.metadata
    }
    account.usageEvents.push(usageEvent)
    return usageEvent
  }

  createTopUp(input: Omit<TopUp, "id" | "consumedCents"> & { id?: string }) {
    const account = this.getAccount(input.accountId)
    const topUp: TopUp = {
      id: input.id ?? `topup_${input.accountId}_${Date.now()}`,
      accountId: input.accountId,
      stream: input.stream,
      amount: input.amount,
      purchasedAt: input.purchasedAt,
      consumedCents: 0
    }
    account.topUps.push(topUp)
    return topUp
  }

  checkEntitlement(input: EntitlementInput): EntitlementResult {
    const account = this.getAccount(input.accountId)
    const plan = findPlan(this.store.plans, account.subscription.planId)
    const feature = plan.features.find((candidate) => candidate.key === input.feature)

    if (feature && !feature.included) {
      return {
        allowed: false,
        feature: input.feature,
        reason: `${plan.name} does not include ${feature.label}.`
      }
    }

    if (!input.metric) {
      return {
        allowed: true,
        feature: input.feature,
        reason: feature ? `${feature.label} is included.` : "Feature is not restricted by plan."
      }
    }

    const quota = plan.quotas.find((candidate) => candidate.metric === input.metric)
    if (!quota) {
      return {
        allowed: false,
        feature: input.feature,
        reason: `Metric ${input.metric} is not configured for ${plan.name}.`
      }
    }

    const events = usageEventsForPeriod(account.usageEvents, input.periodStart, input.periodEnd)
    const currentUsage = events
      .filter((event) => event.metric === input.metric)
      .reduce((sum, event) => sum + event.quantity, 0)
    const requested = input.requestedQuantity ?? 0
    const remaining = quota.included - currentUsage

    return {
      allowed: currentUsage + requested <= quota.included,
      feature: input.feature,
      remaining: Math.max(0, remaining),
      resetAt: input.periodEnd,
      reason: currentUsage + requested <= quota.included
        ? `${quota.included - currentUsage - requested} ${quota.unitLabel} remain in the included allowance.`
        : `Request exceeds included ${quota.metric} allowance; overage billing will apply.`
    }
  }

  listLicensingContracts(accountId?: string) {
    return accountId
      ? activeContractsForAccount(this.store.licensingContracts, accountId)
      : this.store.licensingContracts
  }

  exportLicensingContract(contractId: string) {
    const contract = this.store.licensingContracts.find((candidate) => candidate.id === contractId)
    if (!contract) throw new Error(`Unknown contract: ${contractId}`)
    return buildLicensingExport(contract, this.store.researchMetadataEvents)
  }

  summarizeAccountRevenue(accountId: string): RevenueSummary {
    const account = this.getAccount(accountId)
    const plan = findPlan(this.store.plans, account.subscription.planId)
    const monthlySubscription = plan.monthlyBaseCents + Math.max(0, account.subscription.seats - plan.includedSeats) * plan.extraSeatCents
    const invoice = this.generateInvoice({
      accountId,
      periodStart: "2026-05-01T00:00:00.000Z",
      periodEnd: "2026-06-01T00:00:00.000Z"
    })
    const usageRevenue = invoice.lineItems
      .filter((line) => line.stream === "ai_compute" || line.stream === "data_licensing")
      .reduce((sum, line) => sum + line.totalCents, 0)
    const licensingRevenue = this.store.licensingContracts
      .filter((contract) => contract.accountId === accountId)
      .reduce((sum, contract) => sum + Math.round(contract.annualFeeCents / 12), 0)
    const activeStreams = new Set<RevenueStream>(["subscription"])
    if (usageRevenue > 0) activeStreams.add("ai_compute")
    if (licensingRevenue > 0) activeStreams.add("data_licensing")

    return {
      accountId,
      recurringRevenueCents: monthlySubscription,
      usageRevenueCents: usageRevenue,
      licensingRevenueCents: licensingRevenue,
      projectedMonthlyRevenueCents: monthlySubscription + usageRevenue + licensingRevenue,
      activeStreams: [...activeStreams]
    }
  }

  platformRevenueSummary() {
    const accountSummaries = this.store.accounts.map((account) => this.summarizeAccountRevenue(account.id))
    const subscriptionMrr = accountSummaries.reduce((sum, summary) => sum + summary.recurringRevenueCents, 0)
    const usageMrr = accountSummaries.reduce((sum, summary) => sum + summary.usageRevenueCents, 0)
    const licensingArr = licenseAnnualRunRate(this.store.licensingContracts)
    return {
      subscriptionMrr,
      usageMrr,
      licensingArr,
      projectedMrr: subscriptionMrr + usageMrr + Math.round(licensingArr / 12),
      accounts: accountSummaries
    }
  }
}
