const assert = require("assert");
const { project } = require("./sample-data");
const {
  buildReviewPacket,
  evaluateStatementReadiness,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");

const evaluation = evaluateStatementReadiness(project);
const packet = buildReviewPacket(project);

assert.strictEqual(packet.guard, "collaborative-data-availability-statement-guard");
assert.strictEqual(packet.issue, "SCIBASE-AI/SCIBASE.AI#12");
assert.strictEqual(packet.decision, "block-export-until-availability-evidence-is-clean");
assert.ok(evaluation.score < 70, "expected low readiness score for blocked export");

assert.ok(
  evaluation.findings.some((finding) => finding.rule === "repository-accession-missing"),
  "expected missing repository accession finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "human-derived-data-without-deidentification-evidence"),
  "expected human-derived data finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "reviewer-link-expires-before-review-window"),
  "expected reviewer link expiry finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "required-availability-approver-missing"),
  "expected missing approver finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "blocking-availability-comment-open"),
  "expected blocking comment finding"
);

const cleanProject = JSON.parse(JSON.stringify(project));
cleanProject.collaborators.find((collaborator) => collaborator.role === "data-steward").approval = "approved";
cleanProject.collaborators.find((collaborator) => collaborator.role === "data-steward").approvedAt = "2026-05-22";
cleanProject.editorState.unresolvedComments = [];
cleanProject.editorState.pendingChanges = [];
cleanProject.repositories.find((repository) => repository.id === "repo-data-processed").releaseDate = "2026-05-29";
cleanProject.repositories.find((repository) => repository.id === "repo-data-processed").reviewerLinkExpiresAt = "2026-06-10";
const rawRepo = cleanProject.repositories.find((repository) => repository.id === "repo-data-raw");
rawRepo.accessionId = "OSF-raw-review-notes-restricted";
rawRepo.license = "CC-BY-4.0";
rawRepo.reviewerLinkExpiresAt = "2026-06-10";
rawRepo.deidentificationEvidenceId = "deid-attestation-2026-05";
cleanProject.manuscript.citations.push({
  id: "cite-raw-restricted",
  kind: "dataset",
  accessionId: "OSF-raw-review-notes-restricted",
  sectionId: "data-availability"
});

const cleanPacket = buildReviewPacket(cleanProject);
assert.strictEqual(cleanPacket.decision, "availability-statement-ready");
assert.strictEqual(cleanPacket.findings.length, 0);

const markdown = renderMarkdownReport(packet);
assert.ok(markdown.includes("## Findings"));
assert.ok(markdown.includes("repository-accession-missing"));

const svg = renderSvgSummary(packet);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Data Availability Statement Guard"));

console.log("collaborative-data-availability-statement-guard tests passed");
