"use strict";

const assert = require("assert");
const {
  auditNotebookPreviewIntegrity,
  renderDashboardSvg,
  formatBytes,
} = require("./index");
const {
  cleanNotebookPackage,
  riskyNotebookPackage,
} = require("./sample-data");

const stableTimestamp = "2026-05-20T10:00:00.000Z";

function testCleanPackageIsReady() {
  const report = auditNotebookPreviewIntegrity(cleanNotebookPackage, { generatedAt: stableTimestamp });
  assert.strictEqual(report.decision, "ready");
  assert(report.score >= 90, "expected high score, got " + String(report.score));
  assert.strictEqual(report.remediationPlan.length, 0);
  assert.strictEqual(report.previewManifest.length, 3);
  assert(report.dataciteDraft.identifier.includes("10.5555"));
  assert.strictEqual(report.schemaOrgDataset.distribution.length, 2);
}

function testRiskyPackageIsBlocked() {
  const report = auditNotebookPreviewIntegrity(riskyNotebookPackage, { generatedAt: stableTimestamp });
  assert.strictEqual(report.decision, "blocked");
  assert(report.score < 55, "expected blocked score, got " + String(report.score));
  assert(report.remediationPlan.some(function hasUnsafe(item) {
    return item.checkId === "unsafe-preview-content";
  }));
  assert(report.checks.some(function hasFairWarning(check) {
    return check.id === "fair-metadata" && check.status === "warn";
  }));
  assert(report.previewManifest.some(function hasSecret(cell) {
    return cell.flags.includes("possible-secret");
  }));
  assert(report.previewManifest.some(function hasExternal(cell) {
    return cell.previewMode === "external-reference";
  }));
}

function testDigestIsDeterministic() {
  const first = auditNotebookPreviewIntegrity(cleanNotebookPackage, { generatedAt: stableTimestamp });
  const second = auditNotebookPreviewIntegrity(cleanNotebookPackage, { generatedAt: "2026-05-20T11:00:00.000Z" });
  assert.strictEqual(first.digest, second.digest);
}

function testReviewerArtifactsAreUseful() {
  const report = auditNotebookPreviewIntegrity(riskyNotebookPackage, { generatedAt: stableTimestamp });
  const packet = report.reviewerPacket;
  const svg = renderDashboardSvg(report);

  assert(packet.includes("Notebook Preview Integrity Packet"));
  assert(packet.includes("unsafe-preview-content"));
  assert(svg.includes("<svg"));
  assert(svg.includes("Notebook Preview Integrity Gate"));
  assert.strictEqual(formatBytes(1536), "1.5 KB");
}

testCleanPackageIsReady();
testRiskyPackageIsBlocked();
testDigestIsDeterministic();
testReviewerArtifactsAreUseful();

console.log("notebook-preview-integrity-gate tests passed");
