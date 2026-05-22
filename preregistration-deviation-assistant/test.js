const assert = require("node:assert/strict");
const { evaluatePreregistrationDeviation } = require("./index");
const { holdPacket, readyPacket, reviewPacket } = require("./sample-data");

const holdResult = evaluatePreregistrationDeviation(holdPacket);

assert.equal(holdResult.status, "hold");
assert.equal(holdResult.reviewerPacket.requiredDecision, "hold_confirmatory_review");
assert.ok(holdResult.blockers.length >= 7);
assert.ok(holdResult.auditDigest.includes("MS-HOLD-771:OSF-HOLD-771:hold"));
assert.deepEqual(
  holdResult.blockers
    .map((blocker) => blocker.code)
    .filter((code) =>
      [
        "PRIMARY_OUTCOME_SWITCH",
        "SECONDARY_OUTCOME_PROMOTED",
        "ANALYSIS_MODEL_DEVIATION",
        "MULTIPLE_TESTING_CORRECTION_MISSING",
        "REGISTERED_EXCLUSION_CRITERIA_OMITTED",
        "POST_HOC_EXCLUSION_CRITERIA",
        "UNREGISTERED_SUBGROUP_CONFIRMATORY_CLAIM",
        "RETROSPECTIVE_REGISTRATION",
      ].includes(code),
    )
    .sort(),
  [
    "ANALYSIS_MODEL_DEVIATION",
    "MULTIPLE_TESTING_CORRECTION_MISSING",
    "POST_HOC_EXCLUSION_CRITERIA",
    "PRIMARY_OUTCOME_SWITCH",
    "REGISTERED_EXCLUSION_CRITERIA_OMITTED",
    "RETROSPECTIVE_REGISTRATION",
    "SECONDARY_OUTCOME_PROMOTED",
    "UNREGISTERED_SUBGROUP_CONFIRMATORY_CLAIM",
  ].sort(),
);
assert.ok(
  holdResult.remediationActions.some((action) =>
    action.includes("downgrade unregistered outcomes"),
  ),
);

const readyResult = evaluatePreregistrationDeviation(readyPacket);

assert.equal(readyResult.status, "ready");
assert.equal(readyResult.blockers.length, 0);
assert.equal(readyResult.warnings.length, 0);
assert.equal(readyResult.reviewerPacket.requiredDecision, "release_ai_review");
assert.ok(
  readyResult.readySignals.some((signal) =>
    signal.includes("Primary manuscript outcome matches"),
  ),
);

const reviewResult = evaluatePreregistrationDeviation(reviewPacket);

assert.equal(reviewResult.status, "review");
assert.equal(reviewResult.blockers.length, 0);
assert.deepEqual(
  reviewResult.warnings.map((warning) => warning.code).sort(),
  [
    "EXPLORATORY_LABELING_INCOMPLETE",
    "REGISTERED_SECONDARY_OUTCOME_OMITTED",
    "UNREGISTERED_SUBGROUPS_DISCLOSED",
  ].sort(),
);
assert.equal(reviewResult.reviewerPacket.requiredDecision, "deviation_review");

const missingRegistration = evaluatePreregistrationDeviation({
  manuscript: {
    id: "MS-NO-REG",
    title: "Unregistered manuscript",
    primaryOutcomes: ["effect size"],
  },
  registration: {},
});

assert.equal(missingRegistration.status, "hold");
assert.ok(missingRegistration.blockers.some((blocker) => blocker.code === "MISSING_REGISTRATION_RECORD"));

console.log("preregistration-deviation-assistant tests passed");
