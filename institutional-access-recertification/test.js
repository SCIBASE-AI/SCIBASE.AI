"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  analyzeInstitutionalAccess,
  stableHash,
} = require("./src/institutional-access-recertification");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(result) {
  return new Set(result.findings.map((finding) => finding.id));
}

const flagged = analyzeInstitutionalAccess(sampleBundle);
const flaggedIds = ids(flagged);

assert.equal(flagged.decision, "access-changes-required");
assert.match(flagged.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert(flaggedIds.has("saml-assertion-expired"));
assert(flaggedIds.has("mfa-required-for-elevated-role"));
assert(flaggedIds.has("training-expired-or-missing"));
assert(flaggedIds.has("irb-approval-expired-or-missing"));
assert(flaggedIds.has("access-review-overdue"));
assert(flaggedIds.has("object-grant-exceeds-role"));
assert(flaggedIds.has("orcid-verification-missing"));
assert.equal(
  flagged.memberActions.find((action) => action.memberId === "member-002").recommendedAction,
  "revoke-until-recertified",
);

const recertifiedBundle = clone(sampleBundle);
recertifiedBundle.members[1].roles = ["data-steward"];
recertifiedBundle.members[1].mfaEnabled = true;
recertifiedBundle.members[1].samlAssertionExpiresAt = "2026-10-01T00:00:00.000Z";
recertifiedBundle.members[1].trainingCertifications[0].expiresAt = "2026-12-31T00:00:00.000Z";
recertifiedBundle.members[1].irbApprovals = [
  { protocolId: "IRB-2026-CELL-17", expiresAt: "2026-12-01T00:00:00.000Z" },
];
recertifiedBundle.members[1].lastAccessReviewAt = "2026-05-01T00:00:00.000Z";
recertifiedBundle.members[2].orcidVerifiedAt = "2026-05-01T00:00:00.000Z";
recertifiedBundle.members[2].invitedAt = "2026-05-10T00:00:00.000Z";

const recertified = analyzeInstitutionalAccess(recertifiedBundle);
assert.equal(recertified.decision, "recertified");
assert.equal(recertified.findings.length, 0);
assert.equal(recertified.memberActions.every((action) => action.recommendedAction === "renew"), true);
assert.notEqual(flagged.auditDigest, recertified.auditDigest);
assert.equal(stableHash({ b: ["x"], a: 1 }), stableHash({ a: 1, b: ["x"] }));

console.log("institutional access recertification tests passed");
