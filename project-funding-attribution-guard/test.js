"use strict";

const assert = require("assert");
const {
  evaluateProjectFundingAttribution,
  evaluateFunding,
  evaluateInstitutions,
  evaluateCitationMetadata
} = require("./index");
const { project } = require("./sample-data");

const audit = evaluateProjectFundingAttribution(project);

assert.strictEqual(audit.generatedBy, "project-funding-attribution-guard");
assert.strictEqual(audit.projectId, project.id);
assert.strictEqual(audit.metrics.fundingSources, 2);
assert.ok(audit.metrics.blockedFundingSources >= 1, "fixture should expose funding blockers");
assert.ok(audit.findings.some((finding) => finding.code === "public-project-funding-blocker"));
assert.ok(audit.findings.some((finding) => finding.code === "affiliation-mismatch"));
assert.ok(audit.findings.some((finding) => finding.code === "citation-metadata-warning"));
assert.ok(audit.reviewerActions.every((action) => action.length > 20));

const funding = evaluateFunding(project);
assert.ok(funding.find((source) => source.fundingSourceId === "grant-pediatric-data").blockers.includes("grant id missing"));
assert.ok(funding.find((source) => source.fundingSourceId === "grant-clean-cities").blockers.includes("DOI required before publication"));

const institutions = evaluateInstitutions(project);
assert.ok(institutions.find((item) => item.collaboratorId === "u-luis").blockers.includes("ORCID link missing for attributed contributor"));
assert.ok(institutions.find((item) => item.collaboratorId === "u-mina").blockers.includes("email domain does not match institution domain"));

const citation = evaluateCitationMetadata(project);
assert.strictEqual(citation.readiness, "ready-with-warnings");

console.log("project-funding-attribution-guard tests passed");
