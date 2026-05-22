const assert = require("node:assert/strict");
const { evaluatePersistentIdentifierReadiness } = require("./index");
const { holdPacket, readyPacket, reviewPacket } = require("./sample-data");

const holdResult = evaluatePersistentIdentifierReadiness(holdPacket);

assert.equal(holdResult.status, "hold");
assert.equal(holdResult.reviewerPacket.requiredDecision, "hold_release");
assert.ok(holdResult.blockers.length >= 9);
assert.ok(holdResult.auditDigest.includes("SCI-PID-HOLD-09:hold"));
assert.deepEqual(
  holdResult.blockers
    .map((blocker) => blocker.code)
    .filter((code) =>
      [
        "PERSISTENT_IDENTIFIER_COLLISION",
        "LANDING_PAGE_NOT_ACCESSIBLE",
        "RESOLVER_STATUS_NOT_RELEASE_READY",
        "RESOLVER_TARGET_MISMATCH",
        "DATACITE_METADATA_INCOMPLETE",
        "DIRECT_DOWNLOAD_FOR_RESTRICTED_ARTIFACT",
        "MISSING_REUSE_LICENSE",
        "VERSION_CHAIN_TARGET_MISSING",
        "TOMBSTONE_METADATA_MISSING",
      ].includes(code),
    )
    .sort(),
  [
    "DATACITE_METADATA_INCOMPLETE",
    "DATACITE_METADATA_INCOMPLETE",
    "DIRECT_DOWNLOAD_FOR_RESTRICTED_ARTIFACT",
    "LANDING_PAGE_NOT_ACCESSIBLE",
    "MISSING_REUSE_LICENSE",
    "MISSING_REUSE_LICENSE",
    "PERSISTENT_IDENTIFIER_COLLISION",
    "RESOLVER_STATUS_NOT_RELEASE_READY",
    "RESOLVER_TARGET_MISMATCH",
    "TOMBSTONE_METADATA_MISSING",
    "VERSION_CHAIN_TARGET_MISSING",
  ].sort(),
);
assert.ok(
  holdResult.remediationActions.some((action) =>
    action.includes("Mint distinct identifiers"),
  ),
);

const readyResult = evaluatePersistentIdentifierReadiness(readyPacket);

assert.equal(readyResult.status, "ready");
assert.equal(readyResult.blockers.length, 0);
assert.equal(readyResult.warnings.length, 0);
assert.equal(readyResult.reviewerPacket.requiredDecision, "release_artifacts");
assert.ok(
  readyResult.readySignals.some((signal) =>
    signal.includes("landing page, and resolver evidence"),
  ),
);

const reviewResult = evaluatePersistentIdentifierReadiness(reviewPacket);

assert.equal(reviewResult.status, "review");
assert.equal(reviewResult.blockers.length, 0);
assert.deepEqual(
  reviewResult.warnings.map((warning) => warning.code).sort(),
  ["LANDING_PAGE_NOT_INDEXABLE", "RESOLVER_EVIDENCE_STALE"],
);
assert.equal(reviewResult.reviewerPacket.requiredDecision, "pid_review");

const draftResult = evaluatePersistentIdentifierReadiness({
  reviewDate: "2026-05-22",
  project: {
    id: "SCI-PID-DRAFT-1",
    title: "Internal draft upload",
    releaseStage: "draft",
    artifacts: [{ id: "DRAFT-1", label: "Lab draft notes", state: "active" }],
  },
});

assert.equal(draftResult.status, "ready");
assert.equal(draftResult.blockers.length, 0);
assert.ok(draftResult.readySignals.some((signal) => signal.includes("does not require a PID yet")));

console.log("persistent-identifier-resolution-guard tests passed");
