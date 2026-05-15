"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  classifyArtifact,
  evaluateHostingGovernance,
  stableHash,
} = require("./src/artifact-quarantine-rerun-governance");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const blocked = evaluateHostingGovernance(sampleBundle);

assert.equal(classifyArtifact({ path: "results/table.parquet" }), "dataset");
assert.equal(classifyArtifact({ path: "notebooks/main.ipynb" }), "notebook");
assert.equal(blocked.decision, "hosting-blocked");
assert.match(blocked.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert.equal(blocked.fairScore < 100, true);

const patientReport = blocked.artifactReports.find((report) => report.artifactId === "art-patient-tsv");
assert.equal(patientReport.decision, "quarantine");
assert(patientReport.findings.some((finding) => finding.id === "irb-approval-missing"));
assert(patientReport.findings.some((finding) => finding.id === "deidentification-not-verified"));

const secretReport = blocked.artifactReports.find((report) => report.artifactId === "art-env-secret");
assert.equal(secretReport.decision, "quarantine");
assert(secretReport.findings.some((finding) => finding.id === "secret-signal-detected"));

const safeRun = blocked.computePlans.find((plan) => plan.triggerId === "run-reproduce-figures");
assert.equal(safeRun.decision, "ready");

const blockedRun = blocked.computePlans.find((plan) => plan.triggerId === "run-refresh-clinical-model");
assert.equal(blockedRun.decision, "blocked");
assert(blockedRun.findings.some((finding) => finding.id === "input-artifact-quarantined"));
assert(blockedRun.findings.some((finding) => finding.id === "scheduled-rerun-unapproved"));

const readyBundle = clone(sampleBundle);
readyBundle.artifacts = readyBundle.artifacts.filter((artifact) => artifact.id !== "art-env-secret");
readyBundle.artifacts[1].irbApprovalId = "IRB-2026-041";
readyBundle.artifacts[1].deidentificationEvidence = "verified";
readyBundle.artifacts[1].metadata.schemaOrg = true;
readyBundle.environments[1].lockfileHash = "sha256:conda-lock-2026";
readyBundle.environments[1].networkJustification = "approved";
readyBundle.computeTriggers[1].inputArtifactIds = ["art-patient-tsv"];
readyBundle.computeTriggers[1].estimatedCostCents = 3200;
readyBundle.computeTriggers[1].schedule.approved = true;

const ready = evaluateHostingGovernance(readyBundle);
assert.equal(ready.decision, "ready-for-publication");
assert.equal(ready.artifactReports.every((report) => report.decision === "approved"), true);
assert.equal(ready.computePlans.every((plan) => plan.decision === "ready"), true);
assert.equal(ready.retentionActions.every((action) => action.exportable === true), true);
assert.notEqual(blocked.auditDigest, ready.auditDigest);
assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));

console.log("artifact quarantine rerun governance tests passed");
