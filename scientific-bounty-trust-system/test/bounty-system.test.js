import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildArbitrationCase,
  buildBountyDashboard,
  buildChallengeContract,
  buildSubmissionPackage,
  resolveIpTerms,
  routePayouts
} from "../src/bounty-system.js";
import { sampleChallenge, sampleSubmission } from "../src/sample-data.js";

test("challenge contract requires funded escrow and complete rubric", () => {
  const contract = buildChallengeContract(sampleChallenge);

  assert.equal(contract.readyForPosting, true);
  assert.equal(contract.escrowReady, true);
  assert.equal(contract.rubric.complete, true);
  assert.equal(contract.milestonePayouts.reduce((total, item) => total + item.amountUsd, 0), sampleChallenge.prizePoolUsd);
});

test("submission package protects solver work until award decision", () => {
  const submissionPackage = buildSubmissionPackage(sampleChallenge, sampleSubmission);

  assert.equal(submissionPackage.packageStatus, "complete");
  assert.equal(submissionPackage.workspacePolicy.sponsorCanViewBeforeAward, false);
  assert.equal(submissionPackage.workspacePolicy.solverRetainsPrivateWorkspaceUntilDecision, true);
  assert.equal(submissionPackage.missingDeliverables.length, 0);
});

test("arbitration recommends award only when checklist and scores pass", () => {
  const arbitration = buildArbitrationCase(sampleChallenge, sampleSubmission);

  assert.equal(arbitration.decision, "award-with-feedback");
  assert.ok(arbitration.score.finalScore >= 80);
  assert.ok(arbitration.checklist.every((item) => item.status === "passed"));
});

test("payout routing preserves total prize and supports multiple recipient types", () => {
  const arbitration = buildArbitrationCase(sampleChallenge, sampleSubmission);
  const routing = routePayouts(sampleChallenge, sampleSubmission, arbitration);

  assert.equal(routing.status, "ready-for-release");
  assert.equal(routing.totalRoutedUsd, sampleChallenge.prizePoolUsd);
  assert.ok(routing.payments.some((payment) => payment.recipientType === "individual"));
  assert.ok(routing.payments.some((payment) => payment.recipientType === "team"));
  assert.ok(routing.payments.some((payment) => payment.recipientType === "institution"));
});

test("IP transfer is gated on payout release", () => {
  const arbitration = buildArbitrationCase(sampleChallenge, sampleSubmission);
  const ipTerms = resolveIpTerms(sampleChallenge, sampleSubmission, arbitration);

  assert.equal(ipTerms.status, "pending-payout");
  assert.match(ipTerms.transferCondition, /after platform confirms payout release/);
});

test("dashboard combines trust state across marketplace workflow", () => {
  const dashboard = buildBountyDashboard(sampleChallenge, sampleSubmission);

  assert.equal(dashboard.trustStatus, "protected-award-ready");
  assert.equal(dashboard.challenge.readyForPosting, true);
  assert.equal(dashboard.submission.packageStatus, "complete");
});
