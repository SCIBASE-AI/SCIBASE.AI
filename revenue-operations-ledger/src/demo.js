import {
  applyTopUps,
  buildInstitutionalInvoice,
  decideEntitlements,
  meterUsage,
  packageAnalyticsLicense,
  quoteSubscription,
  summarizeRevenueHealth
} from "./revenue-ledger.js";
import {
  sampleDatasets,
  sampleInstitution,
  sampleSubscription,
  sampleTopUps,
  sampleUsageEvents
} from "./sample-data.js";

export function buildDemoReport() {
  const subscriptionQuote = quoteSubscription(sampleSubscription);
  const usageInvoice = meterUsage({
    accountId: "northbridge-enterprise",
    period: "2026-05",
    events: sampleUsageEvents
  });
  const topUpLedger = applyTopUps({
    accountId: "northbridge-enterprise",
    openingCredits: 12000,
    transactions: sampleTopUps
  });
  const entitlements = decideEntitlements({
    planId: sampleSubscription.planId,
    seats: sampleSubscription.seats,
    usage: usageInvoice.totals,
    topUpCredits: topUpLedger.closingCredits
  });
  const licensingPackage = packageAnalyticsLicense({
    customerId: "northbridge-policy-office",
    seats: 12,
    datasets: sampleDatasets
  });
  const invoice = buildInstitutionalInvoice({
    institution: sampleInstitution,
    subscriptionQuote,
    usageInvoice,
    licensingPackage
  });

  return {
    subscriptionQuote,
    usageInvoice,
    topUpLedger,
    entitlements,
    licensingPackage,
    invoice,
    revenueHealth: summarizeRevenueHealth({ invoices: [invoice] })
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
