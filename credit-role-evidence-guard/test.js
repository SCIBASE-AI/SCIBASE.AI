import assert from "node:assert/strict";
import { evaluateCreditClaims } from "./index.js";
import { sampleArtifacts, sampleCreditClaims, sampleProjects } from "./sample-data.js";

const result = evaluateCreditClaims({
  projects: sampleProjects,
  artifacts: sampleArtifacts,
  claims: sampleCreditClaims,
});

assert.equal(result.summary.approve, 1, "only the software claim should approve cleanly");
assert.equal(result.summary.hold, 4, "four claims should be held for steward review");
assert.equal(result.summary.reject, 2, "two claims should be rejected before publication");

const byClaim = new Map(result.decisions.map((decision) => [decision.claimId, decision]));

assert.equal(byClaim.get("claim-001").decision, "hold");
assert.ok(
  byClaim.get("claim-001").findings.some((finding) => finding.code === "duplicate-credit-claim"),
  "duplicate data curation claim should be held",
);

assert.equal(byClaim.get("claim-002").decision, "approve");
assert.deepEqual(byClaim.get("claim-002").findings, []);

assert.equal(byClaim.get("claim-003").decision, "reject");
assert.ok(
  byClaim.get("claim-003").findings.some((finding) => finding.code === "author-review-credit-conflict"),
  "author peer-review self-credit should reject",
);
assert.ok(
  byClaim.get("claim-003").findings.some((finding) => finding.code === "blind-review-identity-leak"),
  "blind-review evidence should not publish directly to a public profile",
);

assert.equal(byClaim.get("claim-004").decision, "hold");
assert.ok(
  byClaim.get("claim-004").findings.some((finding) => finding.code === "role-evidence-mismatch"),
  "software credit backed by manuscript evidence should be held",
);

assert.equal(byClaim.get("claim-005").decision, "hold");
assert.ok(
  byClaim.get("claim-005").findings.some((finding) => finding.code === "missing-profile-consent"),
  "institutional export without contributor consent should be held",
);

assert.equal(byClaim.get("claim-007").decision, "reject");
assert.ok(
  byClaim.get("claim-007").findings.some((finding) => finding.code === "empty-evidence-set"),
  "validation claim without evidence should reject",
);

console.log("credit-role-evidence-guard tests passed");

