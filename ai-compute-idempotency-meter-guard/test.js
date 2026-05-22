import assert from "node:assert/strict"
import {
  buildIdempotencyKey,
  evaluateComputeBilling,
  stableStringify,
} from "./index.js"
import { accountControls, computeEvents, policy } from "./sample-data.js"

const report = evaluateComputeBilling(computeEvents, policy, accountControls)

assert.equal(report.status, "finance_review_required")
assert.equal(report.totals.rawEvents, 10)
assert.equal(report.totals.idempotencyGroups, 3)
assert.equal(report.totals.heldRows, 1)
assert.equal(report.totals.heldInvoiceAccounts, 1)
assert.equal(report.totals.invoiceCents, 0.44)

const retryEvents = computeEvents.slice(0, 3)
assert.equal(buildIdempotencyKey(retryEvents[0]), buildIdempotencyKey(retryEvents[1]))
assert.equal(buildIdempotencyKey(retryEvents[1]), buildIdempotencyKey(retryEvents[2]))

const retryRow = report.meterRows.find((row) =>
  row.eventIds.includes("evt-001"),
)
assert.equal(retryRow.action, "collapse")
assert.equal(retryRow.retainedEventId, "evt-003")
assert.equal(retryRow.eventIds.length, 3)
assert.ok(retryRow.avoidedOverbillCents > 0)

const orphanedReport = evaluateComputeBilling(
  [
    {
      ...computeEvents[0],
      id: "evt-orphan",
      requestId: "req-orphan",
      lifecycle: "tool_use",
      status: "interrupted",
    },
  ],
  policy,
)
assert.equal(orphanedReport.meterRows[0].action, "hold")
assert.equal(orphanedReport.meterRows[0].reason, "orphaned_tool_call")

const reproducibilityFinding = report.findings.find(
  (finding) =>
    finding.code === "rerun_scope_undefined" && Array.isArray(finding.eventIds),
)
assert.equal(reproducibilityFinding.severity, "critical")
assert.equal(reproducibilityFinding.accountId, "lab-westlake")
assert.deepEqual(reproducibilityFinding.eventIds, ["evt-004", "evt-005"])

const reproducibilityRow = report.meterRows.find((row) =>
  row.eventIds.includes("evt-004"),
)
assert.equal(reproducibilityRow.action, "hold")
assert.equal(reproducibilityRow.reason, "rerun_scope_undefined")
assert.equal(reproducibilityRow.billableCents, 0)

const inflationFinding = report.findings.find(
  (finding) =>
    finding.code === "raw_count_inflation" &&
    finding.accountId === "institute-helix",
)
assert.equal(inflationFinding.accountId, "institute-helix")
assert.ok(inflationFinding.ratio >= policy.rawToDistinctInflationThreshold)

const westlake = report.accountSummaries.find(
  (summary) => summary.accountId === "lab-westlake",
)
assert.equal(westlake.status, "hold")
assert.equal(westlake.billableCents, 0)
assert.equal(westlake.billingDecision, "hold_invoice")
assert.equal(westlake.topUpRemainingCents, 100)

const northbridge = report.accountSummaries.find(
  (summary) => summary.accountId === "lab-northbridge",
)
assert.equal(northbridge.billingDecision, "covered_by_subscription_or_topup")
assert.equal(northbridge.includedUsageAppliedCents, 2)
assert.equal(northbridge.topUpAppliedCents, 0.15)
assert.equal(northbridge.invoiceCents, 0)

const helix = report.accountSummaries.find(
  (summary) => summary.accountId === "institute-helix",
)
assert.equal(helix.billingDecision, "invoice_overage")
assert.equal(helix.invoiceCents, 0.44)

const secondReport = evaluateComputeBilling(computeEvents, policy, accountControls)
assert.equal(report.auditDigest, secondReport.auditDigest)
assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}")

console.log("ai-compute-idempotency-meter-guard tests passed")
