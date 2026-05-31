const assert = require("assert");
const packets = require("./sample-data");
const {
  GENERATED_AT,
  conflictSignals,
  daysOld,
  evaluateHandoff,
  evaluateHandoffBatch,
  missingEvidence,
  needsHumanApproval,
  requiredEvidenceFor,
} = require("./index");

const report = evaluateHandoffBatch(packets);

function decision(id) {
  return report.decisions.find((item) => item.handoffId === id);
}

assert.strictEqual(report.generatedAt, "2026-05-31T00:00:00.000Z");
assert.strictEqual(report.summary.total, 5);
assert.strictEqual(report.summary.release, 1);
assert.strictEqual(report.summary.revise, 1);
assert.strictEqual(report.summary.hold, 3);
assert.strictEqual(report.summary.blockers, 9);
assert.strictEqual(report.summary.warnings, 1);
assert.strictEqual(report.summary.maxSnapshotAgeDays, 50);

const cleanPeerReview = decision("handoff:peer-review-methods-clarity");
assert.strictEqual(cleanPeerReview.decision, "release");
assert.deepStrictEqual(cleanPeerReview.blockers, []);
assert(cleanPeerReview.actions.includes("release handoff to researcher-facing queue"));

const reproducibility = decision("handoff:reproducibility-badge-release");
assert.strictEqual(reproducibility.decision, "hold");
assert(
  reproducibility.blockers.some((item) => item.includes("environment-lock")),
  "reproducibility handoff must require environment lock evidence"
);
assert(
  reproducibility.blockers.some((item) => item.includes("notebook-runner")),
  "reproducibility handoff should stop on upstream runner blocks"
);
assert(
  reproducibility.blockers.some((item) => item.includes("human approval")),
  "auto-publishing a badge should require human approval"
);

const staleGap = decision("handoff:gap-opportunity-corpus-drift");
assert.strictEqual(staleGap.decision, "hold");
assert(
  staleGap.blockers.some((item) => item.includes("artifact revision drift")),
  "gap opportunity should detect corpus revision drift"
);
assert(
  staleGap.blockers.some((item) => item.includes("snapshot is 50 days old")),
  "gap opportunity should detect stale corpus context"
);
assert(
  staleGap.blockers.some((item) => item.includes("novelty-check")),
  "gap opportunity should require novelty evidence"
);

const draftGap = decision("handoff:gap-opportunity-low-confidence");
assert.strictEqual(draftGap.decision, "revise");
assert(
  draftGap.warnings.some((item) => item.includes("needs strengthening")),
  "low-confidence opportunity should stay in draft revision"
);

const privateNote = decision("handoff:peer-review-private-note");
assert.strictEqual(privateNote.decision, "hold");
assert(
  privateNote.blockers.some((item) => item.includes("private reviewer notes")),
  "private reviewer notes should block author-facing release"
);
assert(
  privateNote.blockers.some((item) => item.includes("identity leakage")),
  "reviewer identity leakage should block author-facing release"
);

assert.deepStrictEqual(requiredEvidenceFor(packets[0]), ["manuscript-section", "evidence-snippet"]);
assert.strictEqual(daysOld(packets[0], GENERATED_AT), 1);
assert.strictEqual(missingEvidence(packets[1]).includes("environment-lock"), true);
assert.strictEqual(needsHumanApproval(packets[1]), true);
assert.strictEqual(conflictSignals(packets[1]).length, 1);
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
assert.match(evaluateHandoff(packets[0]).auditDigest, /^[a-f0-9]{64}$/);

console.log("assistant decision handoff guard tests passed");
