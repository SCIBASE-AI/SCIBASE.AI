import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSubmissionProvenance,
  jaccardSimilarity,
  renderReviewerReport
} from "../src/index.js";

const completeArtifact = {
  path: "results/model-card.md",
  sha256: "a".repeat(64),
  license: "CC-BY-4.0",
  dataset: "open-climate-demo"
};

test("complete unique submissions are released", () => {
  const result = evaluateSubmissionProvenance({
    challengeId: "challenge-clean",
    submissions: [
      {
        id: "sub-1",
        teamId: "team-a",
        title: "Regional rainfall model",
        abstract: "Forecast regional rainfall using a documented open dataset.",
        reproducibilityNote: "Run notebook.ipynb with seed 42.",
        artifacts: [completeArtifact]
      }
    ]
  });

  assert.equal(result.summary.release, 1);
  assert.equal(result.decisions[0].decision, "release");
});

test("missing artifact provenance requests revision", () => {
  const result = evaluateSubmissionProvenance({
    challengeId: "challenge-revise",
    submissions: [
      {
        id: "sub-2",
        teamId: "team-b",
        title: "Biomarker screen",
        abstract: "Rank candidate biomarkers for single-cell analysis.",
        artifacts: [{ path: "rankings.csv" }]
      }
    ]
  });

  assert.equal(result.summary.revise, 1);
  assert.equal(result.decisions[0].decision, "revise");
  assert.match(result.decisions[0].reasons.join(" "), /missing sha256/);
  assert.match(result.decisions[0].reasons.join(" "), /missing license/);
});

test("shared artifact hashes across teams put both submissions on hold", () => {
  const result = evaluateSubmissionProvenance({
    challengeId: "challenge-duplicate-hash",
    submissions: [
      {
        id: "sub-3",
        teamId: "team-c",
        title: "Noise-reduction prototype",
        abstract: "Prototype for quantum noise reduction with artifact evidence.",
        reproducibilityNote: "Run demo.js.",
        artifacts: [completeArtifact]
      },
      {
        id: "sub-4",
        teamId: "team-d",
        title: "Independent quantum denoising prototype",
        abstract: "Separate writeup but reuses the same artifact hash.",
        reproducibilityNote: "Run demo.js.",
        artifacts: [{ ...completeArtifact, path: "copied/model-card.md" }]
      }
    ]
  });

  assert.equal(result.summary.hold, 2);
  assert.equal(result.duplicateSignals.length, 1);
  assert.deepEqual(result.duplicateSignals[0].sharedHashes, [completeArtifact.sha256]);
});

test("near-duplicate scientific rationale is held for reviewer triage", () => {
  const similarity = jaccardSimilarity(
    "Open climate benchmark with regional rainfall model and transparent metrics",
    "Open climate benchmark with regional rainfall model and transparent metrics"
  );

  const result = evaluateSubmissionProvenance({
    challengeId: "challenge-near-duplicate",
    submissions: [
      {
        id: "sub-5",
        teamId: "team-e",
        title: "Open climate benchmark",
        abstract: "Regional rainfall model with transparent benchmark metrics.",
        reproducibilityNote: "Run notebook.",
        artifacts: [{ ...completeArtifact, sha256: "b".repeat(64) }]
      },
      {
        id: "sub-6",
        teamId: "team-f",
        title: "Open climate benchmark",
        abstract: "Regional rainfall model with transparent benchmark metrics.",
        reproducibilityNote: "Run notebook.",
        artifacts: [{ ...completeArtifact, sha256: "c".repeat(64) }]
      }
    ]
  });

  assert.equal(similarity, 1);
  assert.equal(result.summary.hold, 2);
});

test("reviewer report renders deterministic summary", () => {
  const result = evaluateSubmissionProvenance({
    challengeId: "challenge-report",
    generatedAt: "2026-06-05T23:00:00Z",
    submissions: [
      {
        id: "sub-7",
        teamId: "team-g",
        title: "Clean submission",
        abstract: "Complete scientific packet.",
        reproducibilityNote: "Run npm test.",
        artifacts: [completeArtifact]
      }
    ]
  });
  const report = renderReviewerReport(result);

  assert.match(report, /Challenge: challenge-report/);
  assert.match(report, /Release: 1/);
  assert.match(report, /Decision: release/);
});
