#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzePacket, renderMarkdown } from "../src/chain-custody-assistant.mjs";

const fixturePath = path.resolve("sample-chain-of-custody-assistant/fixtures/sample-custody-packet.json");
const packet = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const report = analyzePacket(packet);

assert.equal(report.assistant, "sample-chain-of-custody-review");
assert.equal(report.decision, "hold");
assert.equal(report.severityCounts.critical, 4);
assert.equal(report.severityCounts.high, 6);
assert.ok(report.findings.some((finding) => finding.check === "consent-link" && finding.sampleId === "S-1002"));
assert.ok(report.findings.some((finding) => finding.check === "assay-qc" && finding.sampleId === "S-1002"));
assert.ok(report.findings.some((finding) => finding.check === "required-custody-event" && finding.sampleId === "S-1003"));
assert.ok(report.findings.some((finding) => finding.check === "conclusion-release-gate" && finding.sampleId.includes("S-1002")));
assert.ok(report.researchGapPrompts.some((prompt) => prompt.includes("cold-chain")));

const markdown = renderMarkdown(report);
assert.match(markdown, /Decision: HOLD/);
assert.match(markdown, /Sample Chain-of-Custody Review/);
assert.match(markdown, /Research Gap Prompts/);

const cleanPacket = {
  projectId: "SCI-CLEAN",
  title: "Clean custody packet",
  policy: {
    maxTransitGapHours: 4,
    requiredEvents: ["collect", "accession", "storage", "assay-run", "archive"],
    releaseRequiresReviewerSignoff: true
  },
  conclusions: [{ id: "C-clean", sampleIds: ["S-clean"] }],
  samples: [{
    id: "S-clean",
    participantId: "P-clean",
    consentId: "CONS-clean",
    visibleFields: ["sample_id", "collection_day"],
    storageSpec: { minCelsius: 2, maxCelsius: 8 },
    custodyEvents: [
      { type: "collect", timestamp: "2026-01-01T09:00:00Z", actor: "a", signature: "s", location: "clinic" },
      { type: "accession", timestamp: "2026-01-01T10:00:00Z", actor: "b", signature: "s", location: "lab" },
      { type: "storage", timestamp: "2026-01-01T10:15:00Z", actor: "b", signature: "s", location: "fridge", temperatureCelsius: 4 },
      { type: "assay-run", timestamp: "2026-01-01T11:15:00Z", actor: "c", signature: "s", location: "bench", instrumentId: "inst-1", qcStatus: "pass" },
      { type: "archive", timestamp: "2026-01-01T12:00:00Z", actor: "d", signature: "s", location: "archive", temperatureCelsius: -80 }
    ],
    reviewerSignoff: { reviewer: "qa", timestamp: "2026-01-01T13:00:00Z" }
  }]
};

const cleanReport = analyzePacket(cleanPacket);
assert.equal(cleanReport.decision, "release");
assert.equal(cleanReport.findings.length, 0);

console.log("sample chain-of-custody assistant tests passed");
