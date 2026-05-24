const assert = require("assert");
const { componentPolicy, mergeRequests } = require("./sample-data");
const {
  evaluateMergeRequest,
  evaluateRepositoryChanges,
  matchComponent,
  requiredRolesForComponent
} = require("./index");

function codes(evaluation) {
  return evaluation.findings.map((finding) => finding.code);
}

assert.strictEqual(matchComponent("metadata.json", componentPolicy)[0], "metadata");
assert.strictEqual(matchComponent("notebooks/run.ipynb", componentPolicy)[0], "notebooks");

assert.deepStrictEqual(
  requiredRolesForComponent(
    "data",
    [{ path: "data/raw.csv", restricted: true }],
    componentPolicy
  ),
  ["data-steward", "privacy-reviewer", "irb-liaison"]
);

const clean = evaluateMergeRequest(mergeRequests[0], componentPolicy);
assert.strictEqual(clean.decision, "approve-merge");
assert.strictEqual(clean.findings.length, 0);

const restricted = evaluateMergeRequest(mergeRequests[1], componentPolicy);
assert.strictEqual(restricted.decision, "block-merge");
assert.ok(codes(restricted).includes("required-owner-role-missing"));
assert.ok(codes(restricted).includes("conflicted-self-approval"));

const stale = evaluateMergeRequest(mergeRequests[2], componentPolicy);
assert.strictEqual(stale.decision, "block-merge");
assert.ok(codes(stale).includes("stale-approval-after-change"));

const release = evaluateMergeRequest(mergeRequests[3], componentPolicy);
assert.strictEqual(release.decision, "approve-merge");

const result = evaluateRepositoryChanges({
  mergeRequests,
  policy: componentPolicy
});
assert.strictEqual(result.summary.totalMergeRequests, 4);
assert.deepStrictEqual(result.summary.blocked.sort(), ["MR-2417", "MR-2422"]);
assert.deepStrictEqual(result.summary.approved.sort(), ["MR-2401", "MR-2430"]);

console.log("repository-component-owner-approval-guard tests passed");
