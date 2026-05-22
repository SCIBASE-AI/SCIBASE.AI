import assert from "node:assert/strict"
import { evaluateDisclosureConsistency } from "./index.js"
import { projects } from "./sample-data.js"

const evaluation = evaluateDisclosureConsistency(projects)

assert.equal(evaluation.summary.status, "hold_disclosure_review")
assert.equal(evaluation.summary.projectsReviewed, 3)
assert.equal(evaluation.summary.heldProjects, 1)
assert.equal(evaluation.summary.readyProjects, 2)
assert.equal(evaluation.summary.reviseProjects, 0)
assert.equal(evaluation.summary.affectedAuthors, 1)
assert.equal(evaluation.summary.undisclosedFundingCents, 25000000)
assert.equal(evaluation.summary.criticalFindings, 5)
assert.equal(evaluation.summary.warningFindings, 3)
assert.match(evaluation.auditDigest, /^[a-f0-9]{64}$/)

const codes = evaluation.reviewerActions.map((action) => action.code)
assert.ok(codes.includes("missing_competing_interest_statement"))
assert.ok(codes.includes("author_relationship_not_disclosed"))
assert.ok(codes.includes("funding_source_missing_from_statement"))
assert.ok(codes.includes("sponsor_role_missing"))
assert.ok(codes.includes("trial_registry_funding_mismatch"))
assert.ok(codes.includes("data_provider_relationship_missing"))
assert.ok(codes.includes("citation_relationship_context_missing"))
assert.ok(codes.includes("reviewer_disclosure_packet_incomplete"))

console.log("conflict disclosure consistency assistant tests passed")
