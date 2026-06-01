import { mkdir, writeFile } from "node:fs/promises";
import { auditQuotaRollover, buildFinanceMarkdown, buildSummarySvg } from "./index.js";
import { riskyQuotaLedger } from "./sample-data.js";

const reportsDir = new URL("./reports/", import.meta.url);
await mkdir(reportsDir, { recursive: true });

const report = auditQuotaRollover(riskyQuotaLedger);
await writeFile(new URL("quota-rollover-report.json", reportsDir), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(new URL("quota-rollover-report.md", reportsDir), buildFinanceMarkdown(report));
await writeFile(new URL("summary.svg", reportsDir), buildSummarySvg(report));
await writeFile(
  new URL("demo-script.txt", reportsDir),
  [
    "Demo: Subscription Quota Rollover Guard",
    `Account: ${report.accountId}`,
    `Billing cycle: ${report.billingCycle}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Blockers: ${report.summary.blockCount}`,
    "Finance action: hold invoice until duplicate/expired rollover, downgrade caps, and overage units reconcile.",
  ].join("\n"),
);

console.log(JSON.stringify(report.summary, null, 2));
