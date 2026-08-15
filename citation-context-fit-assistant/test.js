const assert = require("assert");
const { project } = require("./sample-data");
const { buildReviewPacket, evaluateCitationFit, renderMarkdownReport, renderSvgSummary, yearsOld } = require("./index");

const evaluation = evaluateCitationFit(project);
const packet = buildReviewPacket(project);

assert.strictEqual(packet.assistant, "citation-context-fit-assistant");
assert.strictEqual(packet.issue, "SCIBASE-AI/SCIBASE.AI#13");
assert.strictEqual(packet.decision, "block-unsafe-citation-insertions");

assert.ok(
  evaluation.findings.some((finding) => finding.rule === "contradictory-citation-for-supporting-claim"),
  "expected contradictory citation finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "contradictory-citation-note-missing"),
  "expected missing contrast note finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "citation-context-irrelevant"),
  "expected irrelevant citation finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "citation-field-fit-too-low"),
  "expected field fit finding"
);
assert.strictEqual(yearsOld("2026-05-22", 2012), 14);

const decisionByCandidate = new Map(evaluation.decisions.map((decision) => [decision.candidateId, decision.decision]));
assert.strictEqual(decisionByCandidate.get("cand-001"), "allow-insertion");
assert.strictEqual(decisionByCandidate.get("cand-002"), "suppress");
assert.strictEqual(decisionByCandidate.get("cand-004"), "suppress");

const cleanProject = JSON.parse(JSON.stringify(project));
cleanProject.candidates = [
  {
    id: "cand-clean-1",
    claimId: "claim-001",
    title: "Prebiotic Intervention Effects in Synthetic Adult Cohorts",
    year: 2024,
    field: "microbiome",
    citationIntent: "direct-support",
    relation: "supports",
    evidenceStrength: 0.9,
    fieldOverlap: 0.95,
    polarity: "positive",
    insertionNote: "Directly supports two-week diversity improvement."
  },
  {
    id: "cand-clean-2",
    claimId: "claim-003",
    title: "Early Metagenomic Pipeline Benchmarks",
    year: 2012,
    field: "metagenomics",
    citationIntent: "background",
    relation: "contextualizes",
    evidenceStrength: 0.64,
    fieldOverlap: 0.67,
    polarity: "neutral",
    insertionNote: "Historical baseline only."
  }
];

const cleanPacket = buildReviewPacket(cleanProject);
assert.strictEqual(cleanPacket.decision, "citation-context-fit-ready");
assert.strictEqual(cleanPacket.findings.length, 0);

const duplicateCandidateProject = JSON.parse(JSON.stringify(cleanProject));
duplicateCandidateProject.candidates.push({ ...duplicateCandidateProject.candidates[0] });
const duplicateCandidatePacket = buildReviewPacket(duplicateCandidateProject);
assert.strictEqual(duplicateCandidatePacket.decision, "block-unsafe-citation-insertions");
assert.ok(
  duplicateCandidatePacket.findings.some((finding) => finding.rule === "citation-candidate-id-duplicate"),
  "expected duplicate candidate identity to block insertion"
);

const invalidScoreProject = JSON.parse(JSON.stringify(cleanProject));
invalidScoreProject.candidates[0].evidenceStrength = "high";
invalidScoreProject.candidates[0].fieldOverlap = 1.4;
const invalidScorePacket = buildReviewPacket(invalidScoreProject);
assert.strictEqual(invalidScorePacket.decision, "block-unsafe-citation-insertions");
assert.ok(
  invalidScorePacket.findings.filter((finding) => finding.rule === "citation-score-invalid").length >= 2,
  "expected malformed normalized scores to block insertion"
);

const invalidRelationProject = JSON.parse(JSON.stringify(cleanProject));
invalidRelationProject.candidates[0].relation = "probably-supports";
invalidRelationProject.candidates[0].citationIntent = "auto-insert";
const invalidRelationPacket = buildReviewPacket(invalidRelationProject);
assert.strictEqual(invalidRelationPacket.decision, "block-unsafe-citation-insertions");
assert.ok(
  invalidRelationPacket.findings.some((finding) => finding.rule === "citation-relation-invalid"),
  "expected unsupported citation relation to block insertion"
);
assert.ok(
  invalidRelationPacket.findings.some((finding) => finding.rule === "citation-intent-invalid"),
  "expected unsupported citation intent to block insertion"
);

const futureYearProject = JSON.parse(JSON.stringify(cleanProject));
futureYearProject.candidates[0].year = 2035;
const futureYearPacket = buildReviewPacket(futureYearProject);
assert.strictEqual(futureYearPacket.decision, "block-unsafe-citation-insertions");
assert.ok(
  futureYearPacket.findings.some((finding) => finding.rule === "citation-year-invalid"),
  "expected future citation year to block insertion"
);

const markdown = renderMarkdownReport(packet);
assert.ok(markdown.includes("## Insertion Decisions"));
assert.ok(markdown.includes("contradictory-citation-for-supporting-claim"));

const svg = renderSvgSummary(packet);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Citation Context-Fit Assistant"));

console.log("citation-context-fit-assistant tests passed");
