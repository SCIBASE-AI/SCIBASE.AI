"use strict";

const assert = require("node:assert/strict");
const { adjacentWorks, manuscript } = require("./sample-data");
const {
  auditNoveltyOverlap,
  generateSvgReport,
  jaccard,
  tokenize,
  usesNoveltyLanguage
} = require("./index");

const audit = auditNoveltyOverlap(manuscript, adjacentWorks);

assert.deepEqual(tokenize("The first federated CRISPR method."), ["first", "federated", "crispr", "method"]);
assert.ok(jaccard("federated crispr ranking", "crispr ranking workflow") > 0.3);
assert.equal(usesNoveltyLanguage("This is the first workflow"), true);
assert.equal(usesNoveltyLanguage("This workflow evaluates evidence"), false);

assert.equal(audit.manuscriptId, manuscript.id);
assert.equal(audit.claimAudits.length, 3);
assert.equal(audit.summaries.abstractStyle.includes("high-risk"), true);
assert.equal(audit.requirementCoverage.paperSummarizer.length, 3);
assert.equal(audit.requirementCoverage.peerReviewAid.includes("rewrittenClaim"), true);
assert.equal(audit.requirementCoverage.citationTool.includes("citationInsertions"), true);

const firstClaim = audit.claimAudits.find((claim) => claim.claimId === "claim-1");
assert.equal(firstClaim.usesNoveltyLanguage, true);
assert.ok(["medium", "high"].includes(firstClaim.risk));
assert.ok(firstClaim.rewrittenClaim.includes("scoped"));

const workflowClaim = audit.claimAudits.find((claim) => claim.claimId === "claim-3");
assert.equal(workflowClaim.currentCitations.length, 0);
assert.ok(workflowClaim.citationInsertions.length >= 1);
assert.ok(workflowClaim.reviewerTasks.some((task) => task.type === "missing-adjacent-work-citation"));

assert.equal(audit.releaseDecision, "revise-before-release");
assert.match(audit.auditDigest, /^[a-f0-9]{64}$/);

const svg = generateSvgReport(audit);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Novelty Overlap Auditor"));
assert.ok(svg.includes(audit.auditDigest.slice(0, 12)));

console.log("AI novelty overlap auditor tests passed");
