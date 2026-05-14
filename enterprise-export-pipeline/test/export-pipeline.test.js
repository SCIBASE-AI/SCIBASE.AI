import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildComplianceEvidence,
  buildEnterpriseDashboard,
  buildExportPackage,
  listExportTargets
} from "../src/export-pipeline.js";
import { sampleProject } from "../src/sample-data.js";

test("lists enterprise export targets across repositories, journals, and funders", () => {
  const targetKeys = listExportTargets().map((target) => target.key);

  assert.ok(targetKeys.includes("institutional-repository"));
  assert.ok(targetKeys.includes("journal-submission"));
  assert.ok(targetKeys.includes("nih-reporter"));
  assert.ok(targetKeys.includes("horizon-eu"));
});

test("builds a Zenodo package that preserves FAIR metadata and excludes private artifacts by default", () => {
  const exportPackage = buildExportPackage(sampleProject, "zenodo");
  const paths = exportPackage.manifest.contents.map((artifact) => artifact.path);

  assert.equal(exportPackage.status, "ready_with_warnings");
  assert.equal(exportPackage.formattingPlugin.id, "fair-research-object-v1");
  assert.equal(exportPackage.manifest.project.doi, sampleProject.doi);
  assert.ok(paths.includes("data/spectra_catalog.csv"));
  assert.ok(paths.includes("code/run_retrievals.py"));
  assert.ok(paths.includes("metadata/schema-org.jsonld"));
  assert.ok(!paths.includes("internal/reviewer-response-draft.md"));
});

test("builds a journal submission package with citations, version history, and webhook handoff", () => {
  const exportPackage = buildExportPackage(sampleProject, "journal-submission");

  assert.equal(exportPackage.target.lane, "journal");
  assert.equal(exportPackage.formattingPlugin.id, "journal-submission-pack-v1");
  assert.ok(exportPackage.manifest.citations.length >= 2);
  assert.ok(exportPackage.manifest.versionHistory.some((version) => version.tag === "preprint-v2.1"));
  assert.equal(exportPackage.integrationEvent.payload.eventType, "enterprise.export.journal.ready");
  assert.match(exportPackage.integrationEvent.signature, /^sha256=[a-f0-9]{64}$/);
});

test("builds funder compliance evidence for NIH reporting", () => {
  const evidence = buildComplianceEvidence(sampleProject, "nih-reporter");

  assert.ok(evidence.requiredEvidence.includes("funderMandates"));
  assert.equal(evidence.openAccessStatus, "ready");
  assert.ok(evidence.funderMandates.some((mandate) => mandate.grantId === "NIR-R01-2042"));
  assert.equal(evidence.artifactDisclosure.privateArtifactsExcludedByDefault, true);
});

test("dashboard summarizes readiness across all export lanes", () => {
  const dashboard = buildEnterpriseDashboard(sampleProject);

  assert.equal(dashboard.summary.totalTargets, listExportTargets().length);
  assert.ok(dashboard.summary.ready + dashboard.summary.readyWithWarnings + dashboard.summary.blocked > 0);
  assert.ok(dashboard.lanes.repository);
  assert.ok(dashboard.lanes.funder);
  assert.ok(dashboard.targets.every((target) => target.webhookTopic));
});

test("can explicitly include private artifacts for controlled internal handoff", () => {
  const exportPackage = buildExportPackage(sampleProject, "institutional-repository", {
    includePrivate: true
  });
  const paths = exportPackage.manifest.contents.map((artifact) => artifact.path);

  assert.ok(paths.includes("internal/reviewer-response-draft.md"));
});

test("throws on unknown export target", () => {
  assert.throws(() => buildExportPackage(sampleProject, "unknown-target"), /Unknown export target/);
});
