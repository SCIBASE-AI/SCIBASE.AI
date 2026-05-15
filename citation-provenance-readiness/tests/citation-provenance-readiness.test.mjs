import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCitationProvenanceReadiness,
  formatCitation,
  normalizeProject,
  rankCandidateCitations
} from "../src/citation-provenance-readiness.mjs";
import sampleProject from "../examples/project.json" with { type: "json" };

describe("citation provenance readiness", () => {
  it("builds a hold report when bibliography and citation coverage are incomplete", () => {
    const report = buildCitationProvenanceReadiness(sampleProject);

    assert.equal(report.readinessStatus, "hold");
    assert.ok(report.readinessScore < 80);
    assert.deepEqual(report.missingBibliography, ["missing2026"]);
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.id === "claim-c2-citation-gap"));
    assert.ok(report.diagnostics.some((diagnostic) => diagnostic.id === "claim-c3-statistical-context"));
  });

  it("ranks open citation candidates with explainable reasons", () => {
    const project = normalizeProject(sampleProject);
    const claim = project.claims.find((candidate) => candidate.id === "c2");
    const ranked = rankCandidateCitations(claim, project.candidateCitations);

    assert.equal(ranked[0].key, "nguyen2025");
    assert.ok(ranked[0].score > ranked[1].score);
    assert.ok(ranked[0].reasons.some((reason) => reason.includes("open access")));
  });

  it("produces stable summaries, insertions, and digest", () => {
    const first = buildCitationProvenanceReadiness(sampleProject);
    const second = buildCitationProvenanceReadiness(sampleProject);

    assert.equal(first.digest, second.digest);
    assert.match(first.summaries.abstract, /citation provenance/);
    assert.equal(first.citationInsertions[0].claimId, "c2");
    assert.match(first.citationInsertions[0].insertionText, /@nguyen2025/);
  });

  it("formats citation suggestions for reviewer-ready insertion plans", () => {
    const project = normalizeProject(sampleProject);
    const citation = project.candidateCitations.find((entry) => entry.key === "nguyen2025");

    assert.match(formatCitation(citation, "apa"), /Nguyen, A\./);
    assert.match(formatCitation(citation, "nature"), /Reproducible notebook capsules/);
  });
});
