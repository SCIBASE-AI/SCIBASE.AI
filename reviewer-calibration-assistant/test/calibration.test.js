import assert from "node:assert/strict";
import { evaluateReviewerCalibration, renderMarkdownReport } from "../src/calibration.js";

const basePacket = {
  projectId: "proj-crispr-042",
  manuscriptId: "ms-review-17",
  domainTemplate: "clinical_trials",
  reviewMode: "double_blind",
  reviews: [
    {
      reviewerId: "rev-a",
      template: "clinical_trials",
      recommendation: "major_revision",
      scores: { clarity: 3, rigor: 2, novelty: 3, reproducibility: 2 },
      claimChecks: [
        { claimId: "c1", evidenceIds: ["e1"] },
        { claimId: "c2", evidenceIds: ["e2"] }
      ]
    },
    {
      reviewerId: "rev-b",
      template: "clinical_trials",
      recommendation: "major_revision",
      scores: { clarity: 3, rigor: 2, novelty: 3, reproducibility: 2 },
      claimChecks: [
        { claimId: "c1", evidenceIds: ["e1"] },
        { claimId: "c2", evidenceIds: ["e2"] }
      ]
    },
    {
      reviewerId: "rev-c",
      template: "clinical_trials",
      recommendation: "major_revision",
      scores: { clarity: 4, rigor: 3, novelty: 3, reproducibility: 3 },
      claimChecks: [
        { claimId: "c1", evidenceIds: ["e1"] },
        { claimId: "c2", evidenceIds: ["e2"] }
      ]
    }
  ]
};

const riskyPacket = {
  ...basePacket,
  reviewMode: "public",
  reviews: [
    basePacket.reviews[0],
    {
      reviewerId: "rev-b",
      template: "molecular_biology",
      recommendation: "accept",
      scores: { clarity: 5, rigor: 5, novelty: 5, reproducibility: 5 },
      claimChecks: [
        { claimId: "c1", evidenceIds: [] },
        { claimId: "c2", evidenceIds: [] }
      ]
    },
    {
      reviewerId: "rev-c",
      template: "clinical_trials",
      recommendation: "reject",
      scores: { clarity: 1, rigor: 1, novelty: 2, reproducibility: 1 },
      claimChecks: [
        { claimId: "c1", evidenceIds: ["e1"] },
        { claimId: "c2", evidenceIds: [] }
      ]
    }
  ]
};

const ready = evaluateReviewerCalibration(basePacket);
assert.equal(ready.decision, "release_review_summary");
assert.equal(ready.blockers.length, 0);
assert.equal(ready.consensusAction, "major_revision");
assert.ok(ready.pairwiseAgreement >= 0.8);

const risky = evaluateReviewerCalibration(riskyPacket);
assert.equal(risky.decision, "calibrate_before_release");
assert.ok(risky.blockers.includes("low_inter_rater_agreement"));
assert.ok(risky.blockers.includes("severe_score_divergence"));
assert.ok(risky.blockers.includes("domain_template_drift"));
assert.ok(risky.blockers.includes("insufficient_evidence_coverage"));
assert.ok(risky.blockers.includes("blind_mode_escalation_required"));
assert.equal(risky.templateDrift[0].reviewerId, "rev-b");
assert.equal(risky.evidenceGaps.length, 2);

assert.throws(() => evaluateReviewerCalibration({ reviews: [basePacket.reviews[0]] }), /at least two/);

const report = renderMarkdownReport(risky);
assert.match(report, /Reviewer Calibration Assistant Report/);
assert.match(report, /calibrate_before_release/);
assert.match(report, /low_inter_rater_agreement/);

console.log("reviewer calibration assistant tests passed");
