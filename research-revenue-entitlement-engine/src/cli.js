import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildInstitutionInvoice,
  prepareLicensingExport,
  revenueHealthSnapshot,
} from "./index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = JSON.parse(readFileSync(join(root, "sample", "revenue-fixture.json"), "utf8"));

const invoice = buildInstitutionInvoice(
  fixture.catalog,
  fixture.accounts[0],
  fixture.usageByAccount[fixture.accounts[0].id],
  fixture.topUps,
);
const licensing = prepareLicensingExport(fixture.licensingExport);
const health = revenueHealthSnapshot(
  fixture.catalog,
  fixture.accounts,
  fixture.usageByAccount,
  fixture.topUps,
);

console.log(
  JSON.stringify(
    {
      invoiceId: invoice.invoiceId,
      invoiceTotal: invoice.total,
      quotaStatus: invoice.quotaStatus,
      licensingReady: licensing.ready,
      mrr: health.monthlyRecurringRevenue,
      arr: health.annualRecurringRevenue,
      quotaAlerts: health.quotaAlerts,
    },
    null,
    2,
  ),
);
