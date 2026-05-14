import test from "node:test";
import assert from "node:assert/strict";
import {
  detectReviewerConflicts,
  evaluateBountySubmission,
  normalizeChallenge,
  scoreSubmission,
  validateEvidenceManifest,
} from "../src/evaluation-ledger.js";
import { challenge, reviews, submission } from "../src/sample-ledger.js";

test("normalizes challenge criteria and default milestones", () => {
  const normalized = normalizeChallenge({
    title: "Minimal Challenge",
    budgetUsd: 250,
    criteria: [{ id: "quality", weight: 1 }],
  });

  assert.equal(normalized.id, "minimal-challenge");
  assert.equal(normalized.milestones[0].amountUsd, 250);
});

test("validates complete evidence manifests", () => {
  const evidence = validateEvidenceManifest(challenge, submission);

  assert.equal(evidence.complete, true);
  assert.deepEqual(evidence.missing, []);
});

test("detects missing evidence", () => {
  const evidence = validateEvidenceManifest(challenge, {
    ...submission,
    evidence: { repository: "https://example.com/repo" },
  });

  assert.equal(evidence.complete, false);
  assert.ok(evidence.missing.includes("demo"));
  assert.ok(evidence.missing.includes("data"));
});

test("detects reviewer conflicts", () => {
  const conflicts = detectReviewerConflicts(
    {
      ...submission,
      contributors: ["reviewer-a"],
      affiliations: ["External Methods Lab"],
    },
    reviews,
  );

  assert.ok(conflicts.some((conflict) => conflict.reason === "reviewer-is-contributor"));
  assert.ok(conflicts.some((conflict) => conflict.reason === "shared-affiliation"));
});

test("scores submissions with weighted review averages", () => {
  const score = scoreSubmission(challenge, reviews);

  assert.equal(score.reviewerScores.length, 2);
  assert.ok(score.average > 0.82);
  assert.ok(score.spread < challenge.arbitrationSpread);
});

test("recommends award when evidence and scores pass", () => {
  const report = evaluateBountySubmission(challenge, submission, reviews);

  assert.equal(report.decision.status, "award_recommended");
  assert.equal(report.payout.ready, true);
  assert.equal(report.payout.totalRecommendedUsd, 1000);
  assert.equal(report.acceptanceRecord.ipTransferPermitted, true);
});

test("requires revision when evidence is missing", () => {
  const report = evaluateBountySubmission(
    challenge,
    {
      ...submission,
      evidence: { repository: "https://example.com/repo" },
    },
    reviews,
  );

  assert.equal(report.decision.status, "revision_required");
  assert.equal(report.payout.ready, false);
});

test("routes high reviewer spread to arbitration", () => {
  const report = evaluateBountySubmission(challenge, submission, [
    reviews[0],
    {
      reviewer: "reviewer-c",
      affiliations: [],
      scores: {
        "scientific-validity": 0.2,
        reproducibility: 0.2,
        documentation: 0.2,
        impact: 0.2,
      },
    },
  ]);

  assert.equal(report.decision.status, "arbitration_required");
  assert.equal(report.payout.ready, false);
});
