const assert = require("node:assert/strict");
const { evaluateReleasePacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanReleasePacket, riskyReleasePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codes(evaluation) {
  return new Set(evaluation.findings.map((finding) => finding.code));
}

const clean = evaluateReleasePacket(cleanReleasePacket);
assert.equal(clean.summary.decision, "publish_release_notes");
assert.equal(clean.findings.length, 0);
assert.equal(clean.summary.highOrCriticalFindings, 0);

const risky = evaluateReleasePacket(riskyReleasePacket);
assert.equal(risky.summary.decision, "hold_repository_release");
assert.equal(risky.summary.highOrCriticalFindings > 0, true);
assert.equal(codes(risky).has("NO_BREAKING_CHANGE_CONFLICT"), true);
assert.equal(codes(risky).has("BREAKING_CHANGE_NOT_DISCLOSED"), true);
assert.equal(codes(risky).has("CLAIM_EVIDENCE_NOT_PASSED"), true);
assert.equal(codes(risky).has("CLAIMED_COMPONENT_WITHOUT_CHANGE"), true);
assert.equal(codes(risky).has("CHANGED_ARTIFACT_UNMENTIONED"), true);
assert.equal(codes(risky).has("EXPORT_DIGEST_MISMATCH"), true);

const stale = clone(cleanReleasePacket);
stale.evidence[0].producedAt = "2025-12-01T00:00:00Z";
const staleResult = evaluateReleasePacket(stale);
assert.equal(staleResult.summary.decision, "revise_release_notes");
assert.equal(codes(staleResult).has("CLAIM_EVIDENCE_STALE"), true);

const missingRequiredKind = clone(cleanReleasePacket);
missingRequiredKind.releaseNotes[0].claimType = "performance";
const missingRequiredKindResult = evaluateReleasePacket(missingRequiredKind);
assert.equal(missingRequiredKindResult.summary.decision, "hold_repository_release");
assert.equal(codes(missingRequiredKindResult).has("CLAIM_KIND_EVIDENCE_MISSING"), true);

const missingExport = clone(cleanReleasePacket);
delete missingExport.exportManifest;
const missingExportResult = evaluateReleasePacket(missingExport);
assert.equal(missingExportResult.summary.decision, "hold_repository_release");
assert.equal(codes(missingExportResult).has("EXPORT_MANIFEST_MISSING"), true);

const markdown = renderMarkdownReport(riskyReleasePacket, risky);
assert.match(markdown, /Release Note Claim Evidence Review/);
assert.match(markdown, /hold_repository_release/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Repository Release Note Claim Guard/);

console.log("repository-release-note-claim-guard tests passed");
