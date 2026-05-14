import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReport } from "../src/demo.js";
import { corpus, project } from "../src/sample-data.js";
import {
  buildReproducibilityRunbook,
  findResearchGaps,
  generatePeerReviewPacket,
  orchestrateAssistantSuite
} from "../src/research-assistant.js";

test("generates peer-review packets with evidence-linked claim checks", () => {
  const packet = generatePeerReviewPacket(project);

  assert.equal(packet.projectId, "urban-heat-health");
  assert.equal(packet.evidenceLinkedClaims.length, 2);
  assert.equal(
    packet.findings.some((finding) => finding.category === "claims_vs_evidence"),
    true
  );
});

test("builds reproducibility runbook with missing-file and nondeterminism flags", () => {
  const runbook = buildReproducibilityRunbook(project);

  assert.equal(runbook.missingFiles.includes("data/manifest.json"), true);
  assert.equal(runbook.flags.includes("environment_not_locked"), true);
  assert.equal(runbook.executionPlan.length, 5);
});

test("finds research gaps with deterministic ordering", () => {
  const gaps = findResearchGaps({ project, corpus });

  assert.equal(gaps.opportunities.length, 3);
  assert.equal(gaps.opportunities[0].id, "paper-b");
  assert.equal(gaps.opportunities[0].reasons.includes("negative_results_available"), true);
});

test("orchestrates peer review, reproducibility, and gap feeds", () => {
  const report = orchestrateAssistantSuite({ project, corpus });

  assert.deepEqual(report.nextActions, [
    "resolve_unsupported_claims",
    "complete_reproducibility_runbook",
    "review_top_gap_opportunity"
  ]);
  assert.equal(report.overallRiskScore > 0, true);
});

test("demo report keeps all issue surfaces present", () => {
  const report = buildDemoReport();

  assert.equal(Boolean(report.peerReview), true);
  assert.equal(Boolean(report.reproducibility), true);
  assert.equal(Boolean(report.researchGaps), true);
});
