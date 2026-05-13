import test from "node:test";
import assert from "node:assert/strict";
import {
  buildArbitrationWorkflow,
  buildChallengePortal,
  buildDashboard,
  buildPayoutPlan,
  buildSubmissionPackage,
  resolveIpPolicy,
} from "../src/system.js";

test("challenge portal validates posting, rubric, escrow, and IP policy", () => {
  const challenge = buildChallengePortal();

  assert.equal(challenge.status, "publishable");
  assert.equal(challenge.readinessScore, 100);
  assert.equal(challenge.posting.prize.total, 75000);
  assert.equal(challenge.posting.ipPolicy.transferTrigger, "final award payout confirmation");
});

test("submission package includes complete manifest and private workspace controls", () => {
  const submission = buildSubmissionPackage();

  assert.equal(submission.status, "ready-for-review");
  assert.equal(submission.packageScore, 100);
  assert.equal(submission.manifest.length, 5);
  assert.equal(submission.accessPolicy.visibility, "private-to-sponsor-and-reviewers");
  assert.equal(submission.auditLog.length, 3);
});

test("arbitration workflow recommends award when package and rubric pass", () => {
  const arbitration = buildArbitrationWorkflow();

  assert.equal(arbitration.checklist.every((item) => item.received), true);
  assert.equal(arbitration.totalScore, 90);
  assert.equal(arbitration.awardRecommendation, "award-final-milestone");
  assert.equal(arbitration.riskFlags.length, 1);
});

test("payout plan routes final milestone and preserves solver rights until paid", () => {
  const payouts = buildPayoutPlan();

  assert.equal(payouts.payoutStatus, "ready-for-sponsor-approval");
  assert.equal(payouts.milestone.pool, 45000);
  assert.equal(payouts.teamRoutes.reduce((total, route) => total + route.sharePercent, 0), 100);
  assert.equal(payouts.ipPolicy.solverRights, "ownership retained until paid");
});

test("dashboard combines every bounty system surface", () => {
  const dashboard = buildDashboard();

  assert.ok(dashboard.challenge);
  assert.ok(dashboard.submission);
  assert.ok(dashboard.arbitration);
  assert.ok(dashboard.payouts);
  assert.equal(resolveIpPolicy().title, "Sponsored IP transfer upon verified payout");
});
