const assert = require("node:assert/strict");
const { evaluateMediaPacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codes(evaluation) {
  return new Set(evaluation.findings.map((finding) => finding.code));
}

const clean = evaluateMediaPacket(cleanPacket);
assert.equal(clean.summary.decision, "release_media_preview_packet");
assert.equal(clean.findings.length, 0);

const risky = evaluateMediaPacket(riskyPacket);
assert.equal(risky.summary.decision, "hold_media_preview_release");
assert.equal(codes(risky).has("EMBARGOED_MEDIA_PUBLIC_PREVIEW"), true);
assert.equal(codes(risky).has("RESTRICTED_MEDIA_PUBLIC_PREVIEW"), true);
assert.equal(codes(risky).has("TRANSCRIPT_COVERAGE_INCOMPLETE"), true);
assert.equal(codes(risky).has("TIMECODE_LABEL_MISSING"), true);
assert.equal(codes(risky).has("THUMBNAIL_PROVENANCE_DRIFT"), true);
assert.equal(codes(risky).has("PREVIEW_SOURCE_CHECKSUM_DRIFT"), true);
assert.equal(codes(risky).has("ALT_TEXT_MISSING_OR_TOO_SHORT"), true);
assert.equal(codes(risky).has("CAPTION_MISSING_OR_TOO_SHORT"), true);
assert.equal(codes(risky).has("ACCESSIBILITY_METADATA_INCOMPLETE"), true);

const reviseOnly = clone(cleanPacket);
reviseOnly.mediaArtifacts[0].caption = "";
const revise = evaluateMediaPacket(reviseOnly);
assert.equal(revise.summary.decision, "revise_media_accessibility_packet");
assert.equal(codes(revise).has("CAPTION_MISSING_OR_TOO_SHORT"), true);

const markdown = renderMarkdownReport(riskyPacket, risky);
assert.match(markdown, /Supplementary Media Accessibility Review/);
assert.match(markdown, /hold_media_preview_release/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Supplementary Media Accessibility Guard/);

console.log("supplementary-media-accessibility-guard tests passed");
