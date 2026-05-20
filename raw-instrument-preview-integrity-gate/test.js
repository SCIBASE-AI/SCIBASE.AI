"use strict";

const assert = require("node:assert/strict");
const {
  buildPreviewIntegrityGate,
  checksumChanged,
  metadataDiff,
  previewDecision,
  unitDrift,
  calibrationDrift
} = require("./index");
const sampleData = require("./sample-data");

const report = buildPreviewIntegrityGate(sampleData);

assert.equal(report.stats.artifactCount, 4);
assert.equal(report.stats.blocked, 1);
assert.equal(report.stats.metadataOnly, 1);
assert.equal(report.stats.safePreview, 2);

const mzml = report.decisions.find((decision) => decision.artifactId === "artifact:mzml-002");
assert.equal(mzml.decision, "block_preview");
assert.equal(mzml.severity, "high");
assert.ok(mzml.reasons.includes("raw artifact checksum changed"));
assert.ok(mzml.reasons.includes("unit metadata drift: intensity"));
assert.ok(mzml.reasons.includes("calibration drift: mz"));
assert.ok(mzml.reasons.includes("preview transform would expose raw values"));
assert.ok(mzml.reasons.includes("restricted_license_requires_metadata_only_preview"));
assert.ok(mzml.reasons.includes("embargoed artifact requires metadata-only preview"));
assert.equal(mzml.datacite.types.resourceType, "Mass spectrometry mzML");
assert.equal(mzml.schemaOrg["@context"], "https://schema.org");

const fcs = report.decisions.find((decision) => decision.artifactId === "artifact:fcs-001");
assert.equal(fcs.decision, "allow_safe_preview");
assert.equal(fcs.previewKind, "gated_scatter_summary");

const h5 = report.decisions.find((decision) => decision.artifactId === "artifact:h5-004");
assert.equal(h5.decision, "metadata_only_preview");
assert.ok(h5.reasons.includes("unit metadata drift: impedance"));
assert.ok(h5.reasons.includes("calibration drift: impedance"));

const stableArtifact = sampleData.artifacts[0];
assert.equal(checksumChanged(stableArtifact), false);
assert.deepEqual(unitDrift(stableArtifact), []);
assert.deepEqual(calibrationDrift(stableArtifact), []);
assert.deepEqual(metadataDiff(stableArtifact), [
  { field: "calibration", expected: { laser405: 1, laser488: 1 }, observed: { laser405: 1.01, laser488: 0.99 } }
]);

const unsupported = previewDecision({
  id: "artifact:raw-unknown",
  title: "Unknown raw bundle",
  fileName: "bundle.raw",
  expectedChecksum: "sha256:a",
  actualChecksum: "sha256:a",
  observedMetadata: {},
  previewTransform: { deterministic: true, recordsLineage: true, requiresRawValueExport: false }
});
assert.equal(unsupported.decision, "block_preview");
assert.ok(unsupported.reasons[0].includes("unsupported raw instrument type"));

console.log("raw-instrument-preview-integrity-gate tests passed");
