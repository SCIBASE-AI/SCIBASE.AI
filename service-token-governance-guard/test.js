import assert from "node:assert/strict"
import { sampleGovernancePacket } from "./sample-data.js"
import {
  digestRecord,
  evaluateServiceTokenGovernance,
  renderOwnerReviewMarkdown,
  renderSummarySvg,
} from "./index.js"

const result = evaluateServiceTokenGovernance(sampleGovernancePacket)

assert.equal(result.summary.totalAccounts, 4)
assert.equal(result.summary.issueOrRetain, 1)
assert.equal(result.summary.holdForOwnerReview, 2)
assert.equal(result.summary.denyOrRevoke, 1)
assert.equal(result.summary.criticalFindings, 1)
assert.equal(result.summary.protectedScopesBlocked, 5)
assert.equal(result.ownerQueue.length, 3)

const notebookWorker = result.decisions.find(
  (decision) => decision.accountId === "svc-notebook-rerun",
)
assert.equal(notebookWorker.decision, "issue_or_retain")
assert.deepEqual(notebookWorker.blockers, [])
assert.ok(notebookWorker.allowedScopes.includes("notebook:run"))

const vendor = result.decisions.find((decision) => decision.accountId === "tok-vendor-export")
assert.equal(vendor.decision, "deny_or_revoke")
assert.equal(vendor.severity, "critical")
assert.ok(vendor.blockers.includes("owner_sponsor_missing"))
assert.ok(vendor.blockers.includes("wildcard_scope"))
assert.ok(vendor.blockers.includes("token_expiry_missing"))
assert.ok(vendor.blockers.includes("requester_mfa_missing"))
assert.ok(vendor.blockers.includes("integration_unverified"))
assert.ok(vendor.blockers.includes("sensitive_protected_grant:dataset-human-rnaseq"))
assert.ok(vendor.rejectedScopes.includes("*"))
assert.ok(vendor.rejectedScopes.includes("restricted-data:download"))

const release = result.decisions.find(
  (decision) => decision.accountId === "svc-manuscript-release",
)
assert.equal(release.decision, "hold_for_owner_review")
assert.ok(release.blockers.includes("approval_event_missing:issued"))
assert.ok(release.rejectedScopes.includes("manuscript:publish"))

const markdown = renderOwnerReviewMarkdown(result)
assert.match(markdown, /Service Account Governance Review Packet/)
assert.match(markdown, /tok-vendor-export/)
assert.doesNotMatch(markdown, /secret|password|private key/i)

const svg = renderSummarySvg(result)
assert.match(svg, /<svg/)
assert.match(svg, /Service Account Governance Guard/)
assert.match(svg, /deny_or_revoke/)

const redactedDigest = digestRecord({
  accountId: vendor.accountId,
  auditDigest: vendor.auditDigest,
})
assert.equal(redactedDigest.length, 64)
assert.equal(result.packetDigest.length, 64)

console.log("service-token-governance-guard tests passed")
