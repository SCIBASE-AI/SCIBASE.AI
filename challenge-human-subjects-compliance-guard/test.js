const assert = require("node:assert/strict");
const { evaluateHumanSubjectsCompliance } = require("./index");
const { holdPacket, readyPacket, reviewPacket } = require("./sample-data");

const holdResult = evaluateHumanSubjectsCompliance(holdPacket);

assert.equal(holdResult.status, "hold");
assert.equal(holdResult.reviewerPacket.requiredDecision, "hold_submission");
assert.ok(holdResult.blockers.length >= 10);
assert.ok(holdResult.auditDigest.includes("CH-HUMAN-042:SUB-TEAM-17:hold"));
assert.deepEqual(
  holdResult.blockers
    .map((blocker) => blocker.code)
    .filter((code) =>
      [
        "ETHICS_APPROVAL_NOT_ACTIVE",
        "CONSENT_GROUP_GAP",
        "DIRECT_IDENTIFIERS_PRESENT",
        "DATA_USE_AGREEMENT_MISSING",
        "PAYOUT_BEFORE_COMPLIANCE",
      ].includes(code),
    )
    .sort(),
  [
    "CONSENT_GROUP_GAP",
    "DATA_USE_AGREEMENT_MISSING",
    "DIRECT_IDENTIFIERS_PRESENT",
    "ETHICS_APPROVAL_NOT_ACTIVE",
    "PAYOUT_BEFORE_COMPLIANCE",
  ],
);
assert.ok(
  holdResult.remediationActions.some((action) =>
    action.includes("Gate IP transfer until compliance hold is cleared"),
  ),
);

const readyResult = evaluateHumanSubjectsCompliance(readyPacket);

assert.equal(readyResult.status, "ready");
assert.equal(readyResult.blockers.length, 0);
assert.equal(readyResult.warnings.length, 0);
assert.equal(readyResult.reviewerPacket.requiredDecision, "release_for_scoring");
assert.ok(
  readyResult.readySignals.some((signal) =>
    signal.includes("Sponsor acknowledged compliance gates"),
  ),
);

const reviewResult = evaluateHumanSubjectsCompliance(reviewPacket);

assert.equal(reviewResult.status, "review");
assert.equal(reviewResult.blockers.length, 0);
assert.deepEqual(
  reviewResult.warnings.map((warning) => warning.code).sort(),
  ["ETHICS_APPROVAL_EXPIRING_SOON", "MEDIUM_REIDENTIFICATION_RISK"],
);
assert.equal(reviewResult.reviewerPacket.requiredDecision, "compliance_review");

const nonHumanResult = evaluateHumanSubjectsCompliance({
  reviewDate: "2026-05-22",
  challenge: {
    id: "CH-NON-HUMAN-1",
    title: "Catalyst benchmark",
    involvesHumanParticipants: false,
    participantGroups: [],
    regulations: [],
  },
  submission: {
    id: "SUB-CATALYST-1",
    teamId: "team-materials",
    artifacts: [{ id: "CAT-1", type: "dataset", humanSubjectData: false }],
  },
});

assert.equal(nonHumanResult.status, "ready");
assert.deepEqual(nonHumanResult.blockers, []);
assert.ok(nonHumanResult.readySignals[0].includes("does not include human-subject data"));

console.log("challenge-human-subjects-compliance-guard tests passed");
