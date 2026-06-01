"use strict";

const assert = require("node:assert/strict");
const {
  evaluateAccessibleExportPacket,
  renderMarkdownReport,
  renderSvgSummary,
  digest
} = require("./index");
const { cleanPacket, revisionPacket, holdPacket } = require("./sample-data");

const fixedNow = "2026-06-01T10:15:00.000Z";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codes(result) {
  return new Set(result.findings.map((finding) => finding.code));
}

const cleanBefore = clone(cleanPacket);
const cleanResult = evaluateAccessibleExportPacket(cleanPacket, { now: fixedNow });
assert.equal(cleanResult.decision, "export_ready");
assert.equal(cleanResult.exportAllowed, true);
assert.equal(cleanResult.findings.length, 0);
assert.deepEqual(cleanPacket, cleanBefore, "evaluation must not mutate the packet");

const revisionResult = evaluateAccessibleExportPacket(revisionPacket, { now: fixedNow });
assert.equal(revisionResult.decision, "revise_before_export");
assert.equal(revisionResult.exportAllowed, false);
assert.equal(codes(revisionResult).has("THIN_OR_GENERIC_ALT_TEXT"), true);
assert.equal(codes(revisionResult).has("COMPLEX_VISUAL_NEEDS_LONG_DESCRIPTION"), true);
assert.equal(codes(revisionResult).has("COLOR_ONLY_ENCODING"), true);
assert.equal(codes(revisionResult).has("ALT_TEXT_STALE_SOURCE_HASH"), true);
assert.equal(codes(revisionResult).has("ALT_TEXT_REVIEW_STALE"), true);
assert.equal(codes(revisionResult).has("UNRESOLVED_ACCESSIBILITY_COMMENT"), true);
assert.equal(codes(revisionResult).has("LOCKED_SECTION_ALT_TEXT_UNAPPROVED"), true);
assert.equal(codes(revisionResult).has("TABLE_HEADER_SCOPE_MISSING"), true);

const holdResult = evaluateAccessibleExportPacket(holdPacket, { now: fixedNow });
assert.equal(holdResult.decision, "hold_accessible_export");
assert.equal(holdResult.exportAllowed, false);
assert.equal(codes(holdResult).has("PRIVATE_PATH_OR_DATA_LEAK"), true);
assert.equal(codes(holdResult).has("REVIEWER_IDENTITY_LEAK"), true);

const report = renderMarkdownReport(holdResult);
assert.match(report, /Collaborative Alt Text Export Guard/);
assert.match(report, /hold_accessible_export/);
assert.match(report, /PRIVATE_PATH_OR_DATA_LEAK/);

const svg = renderSvgSummary(revisionResult);
assert.match(svg, /^<\?xml version="1\.0"/);
assert.match(svg, /Accessible Export Guard/);
assert.match(svg, /revise_before_export/);

assert.equal(digest(cleanPacket), digest(clone(cleanPacket)));
assert.notEqual(digest(cleanPacket), digest(revisionPacket));
assert.throws(() => evaluateAccessibleExportPacket(null), /packet object/);

console.log("All collaborative alt text export guard tests passed.");
