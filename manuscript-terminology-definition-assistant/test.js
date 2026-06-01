const assert = require("node:assert/strict");
const { evaluateTerminologyPacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codes(evaluation) {
  return new Set(evaluation.findings.map((finding) => finding.code));
}

const clean = evaluateTerminologyPacket(cleanPacket);
assert.equal(clean.summary.decision, "release_ai_research_packet");
assert.equal(clean.findings.length, 0);

const risky = evaluateTerminologyPacket(riskyPacket);
assert.equal(risky.summary.decision, "hold_ai_research_packet");
assert.equal(codes(risky).has("ACRONYM_NOT_EXPANDED_AT_FIRST_USE"), true);
assert.equal(codes(risky).has("TERM_DEFINITION_MISSING"), true);
assert.equal(codes(risky).has("ACRONYM_EXPANSION_CONFLICT"), true);
assert.equal(codes(risky).has("NOMENCLATURE_STYLE_MISMATCH"), true);
assert.equal(codes(risky).has("CITATION_BEFORE_TERM_DEFINITION"), true);
assert.equal(codes(risky).has("CITATION_TERM_UNKNOWN"), true);
assert.equal(codes(risky).has("LAY_SUMMARY_JARGON_UNEXPLAINED"), true);

const reviseOnly = clone(cleanPacket);
reviseOnly.terms[1].observedForms = ["GFAP", "Gfap marker"];
reviseOnly.terms[1].preferredForm = "glial fibrillary acidic protein";
const revise = evaluateTerminologyPacket(reviseOnly);
assert.equal(revise.summary.decision, "revise_terminology_packet");
assert.equal(codes(revise).has("PREFERRED_TERM_FORM_ABSENT"), true);

const markdown = renderMarkdownReport(riskyPacket, risky);
assert.match(markdown, /Manuscript Terminology Definition Review/);
assert.match(markdown, /hold_ai_research_packet/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Terminology Definition Assistant/);

console.log("manuscript-terminology-definition-assistant tests passed");
