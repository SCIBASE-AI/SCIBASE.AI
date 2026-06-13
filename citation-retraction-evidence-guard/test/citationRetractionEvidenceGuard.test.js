"use strict";

const assert = require("node:assert/strict");
const packets = require("../examples/citation-evidence-packets.json");
const {
  RELEASE,
  HOLD,
  BLOCK,
  evaluateCitationEvidencePacket,
  evaluateCitationEvidenceBatch,
  summarize
} = require("../src");

const results = evaluateCitationEvidenceBatch(packets, { asOf: "2026-06-14", maxEvidenceAgeYears: 8 });

assert.equal(results[0].decision, RELEASE);
assert.deepEqual(
  results[0].findings.map((finding) => finding.code),
  ["citation_evidence_ready"]
);

assert.equal(results[1].decision, HOLD);
assert(results[1].findings.some((finding) => finding.code === "citation_superseded"));
assert(results[1].findings.some((finding) => finding.code === "background_citation_used_as_support"));

assert.equal(results[2].decision, BLOCK);
assert(results[2].findings.some((finding) => finding.code === "citation_retracted"));
assert(results[2].findings.some((finding) => finding.code === "retracted_citation_supports_claim"));
assert(results[2].findings.some((finding) => finding.code === "citation_contradicts_claim"));
assert(results[2].findings.some((finding) => finding.code === "assistant_recommends_retracted_citation"));

const missingCitation = evaluateCitationEvidencePacket({
  packetId: "packet:missing-citation",
  manuscriptId: "ms:missing-citation",
  generatedAt: "2026-06-14",
  claims: [
    {
      id: "claim:unsupported",
      text: "Unsupported claim.",
      evidence: [{ citationId: "cite:missing", supportRelation: "supports" }]
    }
  ],
  citations: [],
  assistantNote: {
    text: "Recommend a missing source.",
    recommendedCitationIds: ["cite:missing"]
  }
});

assert.equal(missingCitation.decision, BLOCK);
assert(missingCitation.findings.some((finding) => finding.code === "claim_evidence_missing_citation"));
assert(missingCitation.findings.some((finding) => finding.code === "assistant_recommends_missing_citation"));

const summary = summarize(results);
assert.equal(summary.blocks, 4);
assert.equal(summary.reviews, 3);
assert.equal(summary.passes, 1);

console.log("citation retraction evidence guard tests passed");
