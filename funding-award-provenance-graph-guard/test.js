"use strict";

const assert = require("assert");
const {
  analyzeFundingAwardGraph,
  daysBetween,
  hasRequiredAcknowledgement,
  inDateWindow,
  normalizeText,
  resolveFunderId,
} = require("./fundingAwardProvenanceGraphGuard");
const { sampleFundingRecords } = require("./sampleFundingRecords");

assert.strictEqual(normalizeText("  NIH / Grant! "), "nih grant");
assert.strictEqual(daysBetween("2026-05-01", "2026-05-31"), 30);
assert.strictEqual(inDateWindow("2026-02-01", "2026-01-01", "2026-01-15", 20), true);
assert.strictEqual(resolveFunderId("KAKENHI", sampleFundingRecords.aliasCatalog), "funder-jsps");
assert.strictEqual(
  hasRequiredAcknowledgement({
    requiredAcknowledgement: "R01-NS-2048",
    acknowledgementText: "Supported by NIH award R01-NS-2048.",
  }),
  true,
);

const packet = analyzeFundingAwardGraph(sampleFundingRecords);
assert.strictEqual(packet.status, "hold");
assert.strictEqual(packet.summary.records, 5);
assert.strictEqual(packet.summary.release, 1);
assert.strictEqual(packet.summary.review, 1);
assert.strictEqual(packet.summary.hold, 3);

const clean = packet.decisions.find((item) => item.recordId === "funding-clean-nih");
assert(clean);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.findings.length, 0);

const coi = packet.decisions.find((item) => item.recordId === "funding-coi-review");
assert(coi);
assert.strictEqual(coi.decision, "review");
assert(coi.findings.some((finding) => finding.code === "COI_RECOMMENDATION_NEEDS_REVIEW"));

const missingAward = packet.decisions.find((item) => item.recordId === "funding-missing-award");
assert(missingAward);
assert.strictEqual(missingAward.decision, "hold");
assert(missingAward.findings.some((finding) => finding.code === "MISSING_AWARD_ID"));
assert(missingAward.findings.some((finding) => finding.code === "MISSING_REQUIRED_ACKNOWLEDGEMENT"));

const doiMismatch = packet.decisions.find((item) => item.recordId === "funding-doi-mismatch");
assert(doiMismatch);
assert.strictEqual(doiMismatch.decision, "hold");
assert(doiMismatch.findings.some((finding) => finding.code === "DOI_PROJECT_MISMATCH"));
assert(doiMismatch.findings.some((finding) => finding.code === "AWARD_WINDOW_MISMATCH"));

const privatePath = packet.decisions.find((item) => item.recordId === "funding-private-path");
assert(privatePath);
assert.strictEqual(privatePath.decision, "hold");
assert(privatePath.findings.some((finding) => finding.code === "UNKNOWN_FUNDER_ALIAS"));
assert(privatePath.findings.some((finding) => finding.code === "PRIVATE_FUNDER_PATH_EXPOSED"));

const empty = analyzeFundingAwardGraph({ records: [] });
assert.strictEqual(empty.status, "release");
assert.strictEqual(empty.warnings[0].code, "NO_FUNDING_RECORDS");

console.log("funding-award-provenance-graph-guard tests passed");
