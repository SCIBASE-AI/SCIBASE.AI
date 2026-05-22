import assert from "node:assert/strict"
import { evaluateDepositReconciliation } from "./index.js"
import { exportPackages } from "./sample-data.js"

const evaluation = evaluateDepositReconciliation(exportPackages)

assert.equal(evaluation.summary.status, "hold_repository_reconciliation")
assert.equal(evaluation.summary.packagesReviewed, 2)
assert.equal(evaluation.summary.depositTargetsReviewed, 3)
assert.equal(evaluation.summary.verifiedTargets, 1)
assert.equal(evaluation.summary.followUpTargets, 1)
assert.equal(evaluation.summary.heldTargets, 1)
assert.equal(evaluation.summary.criticalFindings, 9)
assert.equal(evaluation.summary.warningFindings, 6)
assert.match(evaluation.auditDigest, /^[a-f0-9]{64}$/)

const codes = evaluation.reviewerActions.map((action) => action.code)
assert.ok(codes.includes("persistent_identifier_mismatch"))
assert.ok(codes.includes("repository_version_mismatch"))
assert.ok(codes.includes("artifact_checksum_mismatch"))
assert.ok(codes.includes("required_artifact_missing_from_deposit"))
assert.ok(codes.includes("contributor_orcid_missing"))
assert.ok(codes.includes("license_metadata_mismatch"))
assert.ok(codes.includes("access_policy_mismatch"))
assert.ok(codes.includes("funder_open_access_deadline_missed"))
assert.ok(codes.includes("webhook_signature_invalid"))
assert.ok(codes.includes("repository_not_indexed"))
assert.ok(codes.includes("credit_role_missing"))
assert.ok(codes.includes("metadata_standard_missing"))
assert.ok(codes.includes("webhook_acknowledgement_missing"))

const dspaceResult = evaluation.packages[0].targets.find(
  (target) => target.targetId === "dspace-cell-atlas",
)
assert.equal(dspaceResult.status, "hold")

const invenioResult = evaluation.packages[1].targets.find(
  (target) => target.targetId === "invenio-crop",
)
assert.equal(invenioResult.status, "follow_up")

console.log("enterprise deposit reconciliation guard tests passed")
