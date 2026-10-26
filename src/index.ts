/**
 * Revenue Infrastructure Core
 * Author: @Dungsky
 */

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UsageMetricType {
  COMPUTE_HOURS = 'COMPUTE_HOURS',
  CLOUD_STORAGE_GB = 'CLOUD_STORAGE_GB',
  DATA_TRANSFER_GB = 'DATA_TRANSFER_GB',
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  baseMonthlyFee: number;
  includedComputeHours: number;
  includedStorageGb: number;
}

export interface UsageRecord {
  customerId: string;
  metric: UsageMetricType;
  quantity: number;
  timestamp: Date;
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

export interface Invoice {
  invoiceId: string;
  customerId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    baseMonthlyFee: 0,
    includedComputeHours: 10,
    includedStorageGb: 5,
  },
  [SubscriptionTier.PRO]: {
    tier: SubscriptionTier.PRO,
    baseMonthlyFee: 49.99,
    includedComputeHours: 100,
    includedStorageGb: 100,
  },
  [SubscriptionTier.ENTERPRISE]: {
    tier: SubscriptionTier.ENTERPRISE,
    baseMonthlyFee: 499.99,
    includedComputeHours: 1000,
    includedStorageGb: 2000,
  },
};

export const USAGE_RATES: Record<UsageMetricType, number> = {
  [UsageMetricType.COMPUTE_HOURS]: 0.15, // Per additional hour
  [UsageMetricType.CLOUD_STORAGE_GB]: 0.05, // Per additional GB
  [UsageMetricType.DATA_TRANSFER_GB]: 0.02, // Per GB transferred
};

export class RevenueEngine {
  private usageLedger: Map<string, UsageRecord[]> = new Map();
  private customerSubscriptions: Map<string, SubscriptionTier> = new Map();

  public setCustomerSubscription(customerId: string, tier: SubscriptionTier): void {
    this.customerSubscriptions.set(customerId, tier);
  }

  public getCustomerSubscription(customerId: string): SubscriptionTier {
    return this.customerSubscriptions.get(customerId) || SubscriptionTier.FREE;
  }

  public recordUsage(record: UsageRecord): void {
    const records = this.usageLedger.get(record.customerId) || [];
    records.push(record);
    this.usageLedger.set(record.customerId, records);
  }

  public calculateInvoice(
    customerId: string,
    startDate: Date,
    endDate: Date,
    taxRate: number = 0.1
  ): Invoice {
    const tier = this.getCustomerSubscription(customerId);
    const plan = SUBSCRIPTION_PLANS[tier];
    const lineItems: InvoiceLineItem[] = [];

    // Base Subscription Fee
    if (plan.baseMonthlyFee > 0) {
      lineItems.push({
        description: `${tier} Subscription Plan Base Fee`,
        amount: plan.baseMonthlyFee,
      });
    }

    // Aggregate usage for the billing period
    const records = (this.usageLedger.get(customerId) || []).filter(
      (r) => r.timestamp >= startDate && r.timestamp <= endDate
    );

    const aggregatedUsage: Record<UsageMetricType, number> = {
      [UsageMetricType.COMPUTE_HOURS]: 0,
      [UsageMetricType.CLOUD_STORAGE_GB]: 0,
      [UsageMetricType.DATA_TRANSFER_GB]: 0,
    };

    for (const record of records) {
      aggregatedUsage[record.metric] += record.quantity;
    }

    // Calculate Overage for Compute
    const billableCompute = Math.max(
      0,
      aggregatedUsage[UsageMetricType.COMPUTE_HOURS] - plan.includedComputeHours
    );
    if (billableCompute > 0) {
      const amount = billableCompute * USAGE_RATES[UsageMetricType.COMPUTE_HOURS];
      lineItems.push({
        description: `Compute Overages (${billableCompute} hrs)`,
        amount: parseFloat(amount.toFixed(2)),
      });
    }

    // Calculate Overage for Storage
    const billableStorage = Math.max(
      0,
      aggregatedUsage[UsageMetricType.CLOUD_STORAGE_GB] - plan.includedStorageGb
    );
    if (billableStorage > 0) {
      const amount = billableStorage * USAGE_RATES[UsageMetricType.CLOUD_STORAGE_GB];
      lineItems.push({
        description: `Storage Overages (${billableStorage} GB)`,
        amount: parseFloat(amount.toFixed(2)),
      });
    }

    // Data Transfer (Pay-as-you-go)
    const transferUsage = aggregatedUsage[UsageMetricType.DATA_TRANSFER_GB];
    if (transferUsage > 0) {
      const amount = transferUsage * USAGE_RATES[UsageMetricType.DATA_TRANSFER_GB];
      lineItems.push({
        description: `Data Transfer (${transferUsage} GB)`,
        amount: parseFloat(amount.toFixed(2)),
      });
    }

    const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
    const tax = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    return {
      invoiceId: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      lineItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      total,
      currency: 'USD',
    };
  }
}
