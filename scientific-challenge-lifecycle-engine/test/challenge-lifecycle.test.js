import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPayoutPlan,
  createSubmissionPackage,
  detectReviewerConflicts,
  normalizeChallenge,
  resolveIpHandoff,
  runChallengeLifecycle,
  scoreSubmission,
} from "../src/index.js";
import fixture from "../sample/biomarker-challenge.json" with { type: "json" };

test("normalizes challenges and validates weighted rubrics", () => {
  const challenge = normalizeChallenge(fixture.challenge);

  assert.equal(challenge.prize.currency, "USD");
  assert.equal(challenge.deliverables.length, 4);
  assert.deepEqual(challenge.verticalTemplateRequirements, [
    "dataset",
    "model",
    "validation-report",
    "ethics-note",
  ]);

  assert.throws(
    () =>
      normalizeChallenge({
        ...fixture.challenge,
        evaluationCriteria: [{ id: "bad", weight: 30 }],
      }),
    /weights must sum to 100/,
  );
});

test("creates deterministic submission packages with required deliverable coverage", () => {
  const first = createSubmissionPackage(fixture.challenge, fixture.submission);
  const second = createSubmissionPackage(fixture.challenge, fixture.submission);

  assert.equal(first.auditHash, second.auditHash);
  assert.equal(first.missingRequired.length, 0);
  assert.equal(first.reproducibility.status, "passed");
  assert.equal(first.artifactManifest.length, 4);

  const missingModel = createSubmissionPackage(fixture.challenge, {
    ...fixture.submission,
    artifacts: fixture.submission.artifacts.filter((artifact) => artifact.type !== "model"),
  });
  assert.deepEqual(missingModel.missingRequired, ["model"]);
});

test("detects reviewer conflicts without blocking independent reviewers", () => {
  const conflicts = detectReviewerConflicts(fixture.submission, [
    { userId: "reviewer-ok", affiliations: ["neutral-lab"], collaboratorIds: [] },
    { userId: "solver-1", affiliations: ["neutral-lab"], collaboratorIds: [] },
    { userId: "reviewer-sponsor", affiliations: ["helix-fund"], collaboratorIds: [] },
    { userId: "reviewer-collab", affiliations: [], collaboratorIds: ["solver-2"] },
  ]);

  assert.deepEqual(
    conflicts.map((conflict) => conflict.reviewerId),
    ["solver-1", "reviewer-sponsor", "reviewer-collab"],
  );
  assert.equal(conflicts[0].reasons[0], "reviewer_is_submitter");
});

test("scores weighted scientific reviews and blocks payouts below threshold", () => {
  const scoring = scoreSubmission(fixture.challenge, fixture.reviews);
  assert.equal(scoring.passed, true);
  assert.equal(scoring.finalScore, 90.05);

  const failedScoring = scoreSubmission(fixture.challenge, [
    {
      reviewerId: "reviewer-1",
      scores: {
        reproducibility: 40,
        scientific_value: 40,
        deliverable_quality: 40,
        timeline_fit: 40,
      },
    },
  ]);
  const pkg = createSubmissionPackage(fixture.challenge, fixture.submission);
  const payout = buildPayoutPlan(fixture.challenge, failedScoring, pkg);

  assert.equal(payout.readyForPayout, false);
  assert.ok(payout.blockingReasons.includes("score_below_threshold"));
});

test("builds milestone payout readiness and sponsored IP transfer state", () => {
  const result = runChallengeLifecycle(
    fixture.challenge,
    fixture.submission,
    fixture.reviewers,
    fixture.reviews,
  );

  assert.equal(result.status, "award_ready");
  assert.equal(result.payoutPlan.readyForPayout, true);
  assert.deepEqual(
    result.payoutPlan.payoutSchedule.map((milestone) => [milestone.milestone, milestone.amount, milestone.ready]),
    [
      ["prototype", 25000, true],
      ["final", 75000, true],
    ],
  );
  assert.equal(result.ipHandoff.status, "transfer_ready");
  assert.equal(result.ipHandoff.action, "execute_ip_transfer_on_payout");
});

test("keeps solver IP when payout blockers remain", () => {
  const pkg = createSubmissionPackage(fixture.challenge, {
    ...fixture.submission,
    artifacts: fixture.submission.artifacts.slice(0, 1),
  });
  const scoring = scoreSubmission(fixture.challenge, fixture.reviews);
  const payout = buildPayoutPlan(
    {
      ...fixture.challenge,
      ipPolicy: { mode: "solver-retains-until-paid" },
    },
    scoring,
    pkg,
  );
  const ip = resolveIpHandoff(
    {
      ...fixture.challenge,
      ipPolicy: { mode: "solver-retains-until-paid" },
    },
    payout,
    fixture.submission,
  );

  assert.equal(payout.readyForPayout, false);
  assert.equal(ip.status, "solver_retains_ip");
});
