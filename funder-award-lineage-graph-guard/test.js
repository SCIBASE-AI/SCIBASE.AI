const assert = require("node:assert/strict");
const { evaluateFunderAwardLineage } = require("./index");
const { holdPacket, readyPacket, reviewPacket } = require("./sample-data");

const holdResult = evaluateFunderAwardLineage(holdPacket);

assert.equal(holdResult.status, "hold");
assert.equal(holdResult.reviewerPacket.requiredDecision, "hold_graph_export");
assert.ok(holdResult.blockers.length >= 9);
assert.ok(holdResult.auditDigest.includes("KG-FUNDER-HOLD-3:hold"));
assert.deepEqual(
  holdResult.blockers
    .map((blocker) => blocker.code)
    .filter((code) =>
      [
        "DUPLICATE_FUNDER_AWARD_NUMBER",
        "AWARD_NUMBER_MISSING",
        "AWARD_FUNDER_NODE_MISSING",
        "PROJECT_AWARD_EDGE_MISSING_TARGET",
        "FUNDED_PROJECT_WITHOUT_AWARD_EDGE",
        "OUTPUT_PROJECT_EDGE_MISSING_TARGET",
        "OUTPUT_AWARD_EDGE_MISSING_TARGET",
        "OPEN_ACCESS_MANDATE_UNMET",
        "INACTIVE_AWARD_USED_IN_VISIBLE_RECOMMENDATION",
        "RECOMMENDATION_AWARD_MISSING",
      ].includes(code),
    )
    .sort(),
  [
    "AWARD_FUNDER_NODE_MISSING",
    "AWARD_NUMBER_MISSING",
    "DUPLICATE_FUNDER_AWARD_NUMBER",
    "FUNDED_PROJECT_WITHOUT_AWARD_EDGE",
    "INACTIVE_AWARD_USED_IN_VISIBLE_RECOMMENDATION",
    "OPEN_ACCESS_MANDATE_UNMET",
    "OUTPUT_AWARD_EDGE_MISSING_TARGET",
    "OUTPUT_PROJECT_EDGE_MISSING_TARGET",
    "PROJECT_AWARD_EDGE_MISSING_TARGET",
    "RECOMMENDATION_AWARD_MISSING",
  ].sort(),
);
assert.ok(
  holdResult.remediationActions.some((action) =>
    action.includes("Merge or disambiguate duplicate award number"),
  ),
);

const readyResult = evaluateFunderAwardLineage(readyPacket);

assert.equal(readyResult.status, "ready");
assert.equal(readyResult.blockers.length, 0);
assert.equal(readyResult.warnings.length, 0);
assert.equal(readyResult.reviewerPacket.requiredDecision, "release_graph");
assert.ok(
  readyResult.readySignals.some((signal) =>
    signal.includes("recommendation"),
  ),
);

const reviewResult = evaluateFunderAwardLineage(reviewPacket);

assert.equal(reviewResult.status, "review");
assert.equal(reviewResult.blockers.length, 0);
assert.deepEqual(
  reviewResult.warnings.map((warning) => warning.code).sort(),
  [
    "AWARD_URI_MISSING",
    "DATA_SHARING_MANDATE_NEEDS_REVIEW",
    "EXPIRED_AWARD_MARKED_ACTIVE",
    "FUNDER_AFFINITY_EXPLANATION_MISSING",
    "FUNDER_REPORTING_EXPORT_NOT_READY",
  ].sort(),
);
assert.equal(reviewResult.reviewerPacket.requiredDecision, "lineage_review");

const emptyResult = evaluateFunderAwardLineage({
  graph: {
    id: "KG-EMPTY",
    title: "Empty graph",
    funders: [],
    awards: [],
    projects: [],
    outputs: [],
  },
});

assert.equal(emptyResult.status, "review");
assert.ok(emptyResult.warnings.some((warning) => warning.code === "NO_AWARD_NODES"));

console.log("funder-award-lineage-graph-guard tests passed");
