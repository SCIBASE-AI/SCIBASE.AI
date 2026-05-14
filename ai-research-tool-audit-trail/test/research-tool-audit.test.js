import assert from "node:assert/strict";
import test from "node:test";
import { sampleManuscript } from "../src/sample-data.js";
import {
  alignClaimsToEvidence,
  buildHallucinationGuardrail,
  buildPaperIntake,
  buildToolAuditPacket,
  clone,
  generateSummary,
  recommendCitations,
  runPeerReviewAid,
} from "../src/research-tool-audit.js";
import { createServer } from "../src/server.js";

test("builds paper intake with section profiles and evidence hashes", () => {
  const intake = buildPaperIntake(sampleManuscript);

  assert.equal(intake.sectionCount, 4);
  assert.equal(intake.claimCount, 3);
  assert.ok(intake.sectionProfiles.every((section) => section.evidenceHash.startsWith("sha256:")));
});

test("generates supported summary modes with evidence spans", () => {
  const abstract = generateSummary(sampleManuscript, "abstract");
  const layperson = generateSummary(sampleManuscript, "layperson");

  assert.equal(abstract.mode, "abstract");
  assert.equal(layperson.mode, "layperson");
  assert.equal(abstract.evidenceSpans.length, sampleManuscript.sections.length);
  assert.match(abstract.summaryHash, /^sha256:/);
});

test("rejects unsupported summary modes", () => {
  assert.throws(() => generateSummary(sampleManuscript, "tweet"), /Unsupported summary mode/);
});

test("aligns claims to evidence and citation coverage", () => {
  const alignment = alignClaimsToEvidence(sampleManuscript);

  assert.equal(alignment.length, sampleManuscript.claims.length);
  assert.ok(alignment.some((claim) => claim.status === "needs-citation"));
  assert.ok(alignment.every((claim) => claim.evidenceHash.startsWith("sha256:")));
});

test("peer review aid flags statistics, compliance, similarity, and claim issues", () => {
  const review = runPeerReviewAid(sampleManuscript);

  assert.equal(review.releaseReadiness, "needs-author-revision");
  assert.ok(review.issues.some((issue) => issue.code === "missing-confidence-interval"));
  assert.ok(review.issues.some((issue) => issue.code === "missing-consent-statement"));
  assert.match(review.reviewHash, /^sha256:/);
});

test("recommends citations with insertion plans and requested formatting", () => {
  const citations = recommendCitations(sampleManuscript, "Nature");

  assert.equal(citations.style, "Nature");
  assert.ok(citations.recommendations.some((citation) => citation.doi === "10.1016/j.cell.2019.0003"));
  assert.ok(citations.recommendations.every((citation) => citation.insertionPlan.length > 0));
  assert.match(citations.citationHash, /^sha256:/);
});

test("guardrail requires human review for unsupported claims or low confidence outputs", () => {
  const guardrail = buildHallucinationGuardrail(sampleManuscript);

  assert.equal(guardrail.status, "needs-human-review");
  assert.ok(guardrail.requiredDisclosures.length >= 3);
  assert.match(guardrail.guardrailHash, /^sha256:/);
});

test("builds full audit packet for all three MVP tools", () => {
  const packet = buildToolAuditPacket(sampleManuscript);

  assert.equal(packet.packetVersion, "ai-research-tool-audit-trail/v0.1");
  assert.equal(packet.summaries.length, 3);
  assert.ok(packet.citations.APA.recommendations.length > 0);
  assert.match(packet.auditHash, /^sha256:/);
});

test("citation formats APA, MLA, and Nature differently", () => {
  const apa = recommendCitations(sampleManuscript, "APA").recommendations[0].formatted;
  const mla = recommendCitations(sampleManuscript, "MLA").recommendations[0].formatted;
  const nature = recommendCitations(sampleManuscript, "Nature").recommendations[0].formatted;

  assert.notEqual(apa, mla);
  assert.notEqual(mla, nature);
});

test("API factory uses injected manuscript data", async () => {
  const manuscript = clone(sampleManuscript);
  manuscript.id = "custom-manuscript";

  const server = createServer(manuscript);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/audit-packet`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.manuscriptId, "custom-manuscript");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
