"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  analyzeAuthorshipGovernance,
  stableHash,
} = require("./src/research-editor-authorship-governance");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(result) {
  return new Set(result.findings.map((finding) => finding.id));
}

const blocked = analyzeAuthorshipGovernance(sampleBundle);
const blockedIds = ids(blocked);

assert.equal(blocked.decision, "submission-blocked");
assert.match(blocked.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert(blockedIds.has("credit-role-uncovered"));
assert(blockedIds.has("author-approval-missing"));
assert(blockedIds.has("coi-disclosure-missing"));
assert(blockedIds.has("contributor-acknowledgement-missing"));
assert(blockedIds.has("blocking-comments-open"));
assert(blockedIds.has("required-suggestions-open"));
assert(blockedIds.has("asset-owner-approval-missing"));
assert(blocked.submissionActions.includes("collect-author-approvals"));

const readyBundle = clone(sampleBundle);
readyBundle.authors[1].creditRoles.push("Writing - review & editing");
readyBundle.authors[1].approvals = [
  {
    manuscriptHash: readyBundle.manuscript.currentHash,
    status: "approved",
    approvedAt: "2026-05-14T12:00:00.000Z",
  },
];
readyBundle.authors[1].coiDisclosure = { status: "submitted", submittedAt: "2026-05-14T12:10:00.000Z" };
readyBundle.authors[1].assetApprovals = ["fig-2"];
readyBundle.contributors[0].acknowledgementStatus = "acknowledged";
readyBundle.comments[0].status = "resolved";
readyBundle.suggestions[0].status = "accepted";

const ready = analyzeAuthorshipGovernance(readyBundle);
assert.equal(ready.decision, "ready-for-submission");
assert.equal(ready.findings.length, 0);
assert.equal(ready.submissionActions.length, 0);
assert.notEqual(blocked.auditDigest, ready.auditDigest);
assert.equal(stableHash({ b: true, a: 4 }), stableHash({ a: 4, b: true }));

console.log("research editor authorship governance tests passed");
