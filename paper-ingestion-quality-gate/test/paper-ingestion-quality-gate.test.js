"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzeIngestionPackets, extractionCompleteness, missingRequiredSections, pageDropCount } = require("../src");
const samples = require("../data/sample_ingestion_packets.json");

test("detects dropped pages", () => {
  assert.equal(pageDropCount({ source: { pageCount: 10 }, extraction: { pagesExtracted: 9 } }), 1);
  assert.equal(pageDropCount({ source: { pageCount: 10 }, extraction: { pagesExtracted: 11 } }), 0);
});

test("detects missing required scientific sections", () => {
  const missing = missingRequiredSections({ extraction: { sectionsPresent: ["abstract", "methods"] } });
  assert.deepEqual(missing, ["results", "discussion"]);
});

test("computes extraction completeness", () => {
  const score = extractionCompleteness(samples.find((item) => item.id === "ingest-summarize-001"));
  assert.ok(score > 0.95);
});

test("allows clean paper intake to summarize", () => {
  const result = analyzePacket(samples.find((item) => item.id === "ingest-summarize-001"));
  assert.equal(result.decision, "SUMMARIZE");
  assert.equal(result.findings.length, 0);
});

test("holds low-quality OCR with dropped pages and missing methods", () => {
  const result = analyzePacket(samples.find((item) => item.id === "ingest-hold-002"));
  assert.equal(result.decision, "HOLD");
  assert.ok(result.findings.some((item) => item.code === "PDF_PAGE_DROP_DETECTED"));
  assert.ok(result.findings.some((item) => item.code === "REQUIRED_SECTION_MISSING"));
  assert.ok(result.findings.some((item) => item.code === "OCR_OR_ENCODING_QUALITY_LOW"));
  assert.ok(result.findings.some((item) => item.code === "SUMMARIZER_NOT_GATED_ON_CLEAN_INTAKE"));
});

test("routes incomplete tables and captions for review", () => {
  const result = analyzePacket(samples.find((item) => item.id === "ingest-review-003"));
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.findings.some((item) => item.code === "TABLE_EXTRACTION_INCOMPLETE"));
  assert.ok(result.findings.some((item) => item.code === "FIGURE_CAPTION_MAP_INCOMPLETE"));
});

test("holds unsafe key-finding generation when reference and equation extraction fail", () => {
  const result = analyzePacket(samples.find((item) => item.id === "ingest-hold-004"));
  assert.equal(result.decision, "HOLD");
  assert.ok(result.findings.some((item) => item.code === "REFERENCE_PARSE_COVERAGE_LOW"));
  assert.ok(result.findings.some((item) => item.code === "EQUATION_EXTRACTION_COVERAGE_LOW"));
  assert.ok(result.findings.some((item) => item.code === "SUMMARIZER_NOT_GATED_ON_CLEAN_INTAKE"));
});

test("aggregates paper ingestion decisions", () => {
  const report = analyzeIngestionPackets(samples);
  assert.equal(report.totalPackets, 4);
  assert.deepEqual(report.counts, { SUMMARIZE: 1, REVIEW: 1, HOLD: 2 });
});
