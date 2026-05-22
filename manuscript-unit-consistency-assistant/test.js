"use strict";

const assert = require("node:assert/strict");
const {
  analyzeManuscript,
  extractSectionMeasurements,
  normalizeUnit,
} = require("./index");
const { cleanManuscript, sampleManuscript } = require("./sample-data");

function runTests() {
  assert.equal(normalizeUnit("mM").family, "molar_concentration");
  assert.equal(normalizeUnit("ng/mL").family, "mass_concentration");
  assert.equal(normalizeUnit("x g").canonical, "xg");

  const measurements = extractSectionMeasurements(sampleManuscript.sections, sampleManuscript.trackedTerms);
  assert.ok(measurements.some((measurement) => measurement.subject === "metformin" && measurement.unit === "mM"));
  assert.ok(measurements.some((measurement) => measurement.subject === "IL-6" && measurement.unit === "ng/mL"));

  const result = analyzeManuscript(sampleManuscript);
  assert.equal(result.summary.manuscriptId, "SCIBASE-MUCA-001");
  assert.ok(result.summary.measurementsReviewed >= 10);
  assert.ok(result.findings.some((finding) => finding.type === "unit-family-conflict"));
  assert.ok(result.findings.some((finding) => finding.type === "missing-unit"));
  assert.ok(result.findings.some((finding) => finding.type === "range-outlier"));
  assert.ok(result.findings.some((finding) => finding.type === "table-unit-drift"));
  assert.ok(result.reviewerActions.some((action) => action.blocksSubmission));
  assert.equal(result.auditDigest, analyzeManuscript(sampleManuscript).auditDigest);

  const clean = analyzeManuscript(cleanManuscript);
  assert.equal(clean.findings.length, 0);
  assert.equal(clean.summary.readinessScore, 100);
  assert.equal(clean.summary.readiness, "ready-with-minor-edits");

  console.log("manuscript-unit-consistency-assistant tests passed");
}

runTests();
