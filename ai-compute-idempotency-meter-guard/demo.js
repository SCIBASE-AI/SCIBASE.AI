import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { evaluateComputeBilling } from "./index.js"
import { accountControls, computeEvents, policy } from "./sample-data.js"

const report = evaluateComputeBilling(computeEvents, policy, accountControls)
const reportsDir = new URL("./reports/", import.meta.url)
mkdirSync(reportsDir, { recursive: true })

const markdown = `# AI Compute Idempotency Meter Guard

Status: ${report.status}

## Totals
- Raw events: ${report.totals.rawEvents}
- Idempotency groups: ${report.totals.idempotencyGroups}
- Collapsed retry rows: ${report.totals.collapsedRows}
- Held rows: ${report.totals.heldRows}
- Billable usage: ${report.totals.billableCents} cents
- Avoided overbill: ${report.totals.avoidedOverbillCents} cents
- Invoice overage: ${report.totals.invoiceCents} cents
- Held invoice accounts: ${report.totals.heldInvoiceAccounts}
- Audit digest: ${report.auditDigest}

## Account Decisions
${report.accountSummaries
  .map(
    (summary) =>
      `- ${summary.accountId}: ${summary.billingDecision}, ${summary.plan}, ${summary.paymentRail}, billable ${summary.billableCents}c, invoice ${summary.invoiceCents}c, top-up applied ${summary.topUpAppliedCents}c, avoided ${summary.avoidedOverbillCents}c, critical findings ${summary.criticalFindings}`,
  )
  .join("\n")}

## Highest-Risk Findings
${report.findings
  .filter((finding) => finding.severity !== "info")
  .map((finding) => `- ${finding.severity}: ${finding.code} (${finding.accountId}) - ${finding.message}`)
  .join("\n")}
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="56" y="54" width="1168" height="612" rx="22" fill="#f8fafc"/>
  <text x="96" y="128" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#111827">AI Compute Idempotency Meter Guard</text>
  <text x="96" y="178" font-family="Arial, sans-serif" font-size="22" fill="#334155">Finance review status: ${report.status}</text>
  <g font-family="Arial, sans-serif" font-size="24" fill="#111827">
    <text x="96" y="260">Raw events: ${report.totals.rawEvents}</text>
    <text x="96" y="305">Idempotency groups: ${report.totals.idempotencyGroups}</text>
    <text x="96" y="350">Collapsed retry rows: ${report.totals.collapsedRows}</text>
    <text x="96" y="395">Held rows: ${report.totals.heldRows}</text>
    <text x="96" y="440">Avoided overbill: ${report.totals.avoidedOverbillCents} cents</text>
    <text x="96" y="485">Invoice overage: ${report.totals.invoiceCents} cents</text>
  </g>
  <rect x="700" y="230" width="430" height="248" rx="14" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/>
  <text x="732" y="286" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#075985">Controls covered</text>
  <text x="732" y="336" font-family="Arial, sans-serif" font-size="22" fill="#075985">Content-hash retry collapse</text>
  <text x="732" y="378" font-family="Arial, sans-serif" font-size="22" fill="#075985">Raw vs attributed count guard</text>
  <text x="732" y="420" font-family="Arial, sans-serif" font-size="22" fill="#075985">Rerun-scope billing hold</text>
  <text x="96" y="590" font-family="Arial, sans-serif" font-size="18" fill="#475569">Audit digest: ${report.auditDigest.slice(0, 48)}...</text>
</svg>
`

writeFileSync(join(reportsDir.pathname, "summary.json"), `${JSON.stringify(report, null, 2)}\n`)
writeFileSync(join(reportsDir.pathname, "finance-review-packet.md"), markdown)
writeFileSync(join(reportsDir.pathname, "summary.svg"), svg)

console.log(`Status: ${report.status}`)
console.log(`Raw events: ${report.totals.rawEvents}`)
console.log(`Idempotency groups: ${report.totals.idempotencyGroups}`)
console.log(`Collapsed retry rows: ${report.totals.collapsedRows}`)
console.log(`Held rows: ${report.totals.heldRows}`)
console.log(`Avoided overbill: ${report.totals.avoidedOverbillCents} cents`)
console.log(`Invoice overage: ${report.totals.invoiceCents} cents`)
console.log(`Held invoice accounts: ${report.totals.heldInvoiceAccounts}`)
console.log(`Audit digest: ${report.auditDigest}`)
