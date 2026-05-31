"use strict";

const assert = require("assert");
const {
  analyzeDuplicateSolverRisk,
  artifactFingerprint,
  collectPaymentRoutes,
  jaccard,
  normalizeId,
  tokenize,
} = require("./duplicateSolverGuard");
const { sampleChallenge } = require("./sampleChallenge");

assert.strictEqual(normalizeId("@Solver-One"), "solver-one");
assert.deepStrictEqual(tokenize("A fast, reproducible model."), ["fast", "reproducible", "model"]);
assert.strictEqual(jaccard(["a", "b"], ["b", "c"]), 1 / 3);
assert.deepStrictEqual(artifactFingerprint(sampleChallenge.submissions[0]), ["sha256:aaa111", "sha256:bbb222"]);
assert.deepStrictEqual(collectPaymentRoutes(sampleChallenge.submissions[2]), ["bank:institutional-lab-42"]);

const packet = analyzeDuplicateSolverRisk(sampleChallenge);
assert.strictEqual(packet.status, "blocked");
assert.strictEqual(packet.summary.submissions, 4);
assert.strictEqual(packet.summary.blockers, 3);
assert.strictEqual(packet.summary.reviewItems, 2);
assert.strictEqual(packet.summary.eligible, 0);

const blockerCodes = packet.blocked.map((item) => item.code).sort();
assert.deepStrictEqual(blockerCodes, [
  "ARTIFACT_HASH_OVERLAP",
  "SOLVER_MULTI_SUBMISSION",
  "TEAM_MULTI_SUBMISSION",
]);

const paymentReview = packet.review.find((item) => item.code === "PAYMENT_ROUTE_REUSED");
assert(paymentReview);
assert.deepStrictEqual(paymentReview.submissionIds, ["sub-alpha", "sub-beta"]);

const cleanPacket = analyzeDuplicateSolverRisk({
  checkedAt: "2026-05-31T07:05:00.000Z",
  submissions: [
    {
      id: "a",
      teamIds: ["team-a"],
      solvers: [{ id: "solver-a" }],
      paymentRoutes: [{ network: "bank", account: "a" }],
      abstract: "A new enzyme search benchmark.",
      deliverablesSummary: "Assay design and signed result packet.",
      artifacts: [{ sha256: "sha256:1" }],
    },
    {
      id: "b",
      teamIds: ["team-b"],
      solvers: [{ id: "solver-b" }],
      paymentRoutes: [{ network: "bank", account: "b" }],
      abstract: "A materials simulation for battery electrolytes.",
      deliverablesSummary: "Simulation notebook and validation summary.",
      artifacts: [{ sha256: "sha256:2" }],
    },
  ],
});
assert.strictEqual(cleanPacket.status, "pass");
assert.strictEqual(cleanPacket.summary.eligible, 2);

const emptyPacket = analyzeDuplicateSolverRisk({ submissions: [] });
assert.strictEqual(emptyPacket.status, "pass");
assert.strictEqual(emptyPacket.warnings[0].code, "NO_SUBMISSIONS");

console.log("scientific-bounty-duplicate-solver-guard tests passed");
