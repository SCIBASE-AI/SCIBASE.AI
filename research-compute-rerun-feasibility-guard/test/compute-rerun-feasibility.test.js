import { readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { DECISIONS, analyzeRerunPacket, analyzeRerunPackets } from "../src/index.js";

const fixtures = JSON.parse(
  await readFile(join(process.cwd(), "data", "sample-rerun-packets.json"), "utf8")
);

test("classifies synthetic rerun packets by release gate", () => {
  const report = analyzeRerunPackets(fixtures);
  assert.equal(report.packetCount, 4);
  assert.equal(report.decisionCounts[DECISIONS.RELEASE], 1);
  assert.equal(report.decisionCounts[DECISIONS.REVISE], 1);
  assert.equal(report.decisionCounts[DECISIONS.HOLD], 2);
});

test("holds assistant output when memory and cloud disclosures are unsafe", () => {
  const result = analyzeRerunPacket(fixtures.find((packet) => packet.id === "paper-gpu-overclaim-hold"));
  assert.equal(result.decision, DECISIONS.HOLD);
  assert.equal(result.releaseGate.canReleaseAssistantOutput, false);
  assert(result.findings.some((finding) => finding.code === "DATASET_MEMORY_EXCEEDS_NODE"));
  assert(result.findings.some((finding) => finding.code === "GPU_VRAM_FEASIBILITY_GAP"));
  assert(result.findings.some((finding) => finding.code === "CLOUD_OR_HPC_COST_UNDISCLOSED"));
});

test("revises long queued runs when timing and resource notes are incomplete", () => {
  const result = analyzeRerunPacket(fixtures.find((packet) => packet.id === "paper-hpc-revise"));
  assert.equal(result.decision, DECISIONS.REVISE);
  assert(result.findings.some((finding) => finding.code === "RUNTIME_BUDGET_UNREALISTIC"));
  assert(result.findings.some((finding) => finding.code === "RESOURCE_IMPACT_NOTE_MISSING"));
});

test("releases assistant output for complete low-cost reviewer fixtures", () => {
  const result = analyzeRerunPacket(fixtures.find((packet) => packet.id === "paper-cpu-fixture-pass"));
  assert.equal(result.decision, DECISIONS.RELEASE);
  assert.equal(result.findings.length, 0);
  assert.equal(result.releaseGate.canReleaseAssistantOutput, true);
  assert(result.score >= 90);
});

test("summaries include reviewer-relevant compute facts", () => {
  const result = analyzeRerunPacket(fixtures.find((packet) => packet.id === "paper-vram-fixture-needed"));
  assert.equal(result.decision, DECISIONS.HOLD);
  assert.equal(result.summary.estimatedWorkingSetGb, 109.2);
  assert.equal(result.summary.totalGpuVramGb, 40);
  assert(result.summary.findingCount >= 3);
});
