"use strict";

const assert = require("assert");
const { auditCitationSet, claimCoverage, scoreCitation } = require("./index");
const { manuscript, recommendedCitations, candidatePool } = require("./sample-data");

const audit = auditCitationSet({
  manuscript,
  citations: recommendedCitations,
  candidatePool
});

assert.strictEqual(audit.generatedBy, "citation-diversity-coverage-auditor");
assert.strictEqual(audit.manuscriptId, manuscript.id);
assert.strictEqual(audit.coverage.length, manuscript.claims.length);
assert.ok(audit.metrics.coverageScore > 0.7, "expected most claims to have some coverage");
assert.ok(audit.metrics.topRegionShare > 0.5, "fixture should expose concentration risk");
assert.ok(audit.findings.some((finding) => finding.code === "risky-citation"), "retracted fixture should be blocked");
assert.ok(audit.citationActions.some((citation) => citation.id === "R6" && citation.action === "block"));
assert.ok(audit.replacementSuggestions.length >= 2, "expected replacement suggestions");
assert.ok(audit.replacementSuggestions[0].reasons.some((reason) => reason.includes("open access")));
assert.ok(audit.reviewerActions.every((action) => action.length > 20));

const coverage = claimCoverage(manuscript, recommendedCitations);
const equityCoverage = coverage.find((item) => item.claimId === "C4");
assert.ok(equityCoverage.coveredNeeds.includes("low-income-households"));

const retractedScore = scoreCitation(recommendedCitations.find((citation) => citation.id === "R6"), manuscript.year);
const strongScore = scoreCitation(recommendedCitations.find((citation) => citation.id === "R1"), manuscript.year);
assert.ok(strongScore > retractedScore, "risk flags should lower citation score");

console.log("citation-diversity-coverage-auditor tests passed");
