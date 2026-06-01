"use strict";

const assert = require("node:assert/strict");
const {
  evaluateGeospatialReviewPacket,
  renderMarkdownReport,
  renderSvgSummary,
  haversineKm
} = require("./index");
const { riskyPacket, cleanPacket } = require("./sample-data");

assert.throws(() => evaluateGeospatialReviewPacket(null), /expects a packet object/);

const risky = evaluateGeospatialReviewPacket(riskyPacket, { now: "2026-06-01T10:30:00.000Z" });
assert.equal(risky.status, "HOLD");
assert.equal(risky.reviewDecisions[0].decision, "HOLD");
assert.ok(risky.findings.some((item) => item.code === "SPATIAL_SPLIT_LEAKAGE"));
assert.ok(risky.findings.some((item) => item.code === "MISSING_CRS_EVIDENCE"));
assert.ok(risky.findings.some((item) => item.code === "HIGH_SPATIAL_AUTOCORRELATION_RANDOM_SPLIT"));
assert.ok(risky.findings.some((item) => item.code === "TEST_SET_TUNING"));
assert.ok(risky.researchGapOpportunities.length >= 2);
assert.ok(risky.reviewDecisions[0].reproducibilityScore < 50);

const riskyRepeat = evaluateGeospatialReviewPacket(riskyPacket, { now: "2026-06-01T10:31:00.000Z" });
assert.equal(risky.fingerprint, riskyRepeat.fingerprint);

const clean = evaluateGeospatialReviewPacket(cleanPacket, { now: "2026-06-01T10:30:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.reviewDecisions[0].reproducibilityScore, 100);

const invalidCoordinatePacket = {
  id: "invalid-coordinate",
  manuscripts: [
    {
      id: "bad-coordinate",
      spatialDesign: { crs: "EPSG:4326", coordinatePrecisionDecimals: 2 },
      claims: [],
      samples: [{ id: "bad", lat: 110, lon: -74, split: "train", region: "X" }],
      models: [],
      reproducibilityArtifacts: { dataManifest: "m", codeCommit: "c", environmentSpec: "e" }
    }
  ]
};
const invalid = evaluateGeospatialReviewPacket(invalidCoordinatePacket, { now: "2026-06-01T10:30:00.000Z" });
assert.ok(invalid.findings.some((item) => item.code === "INVALID_COORDINATE"));

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.ok(markdown.includes("Spatial-Autocorrelation"));
assert.ok(markdown.includes("SPATIAL_SPLIT_LEAKAGE"));
assert.ok(markdown.includes("Research Gap Opportunities"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Geospatial review assistant"));

const distance = haversineKm(40.712776, -74.005974, 40.734112, -73.98742);
assert.ok(distance > 2 && distance < 4);

console.log("All geospatial spatial-autocorrelation assistant tests passed.");
