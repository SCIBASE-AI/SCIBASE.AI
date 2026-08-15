const assert = require("assert");
const { project } = require("./sample-data");
const { buildReviewPacket, escapeXml, evaluateClaim, renderMarkdownReport, renderSvgSummary } = require("./index");

const packet = buildReviewPacket(project);

assert.strictEqual(packet.assistant, "external-validity-transfer-assistant");
assert.strictEqual(packet.issue, "SCIBASE-AI/SCIBASE.AI#16");
assert.ok(packet.peerReviewSuggestions.length >= 6, "expected transfer-risk peer review suggestions");
assert.ok(packet.reproducibilityActions.length >= 3, "expected reproducibility actions");
assert.ok(packet.researchGaps.length >= 3, "expected research-gap prompts");

const broadClaim = packet.claimReviews.find((review) => review.id === "claim-generalizable-oncology");
assert.ok(broadClaim, "expected broad generalizability claim review");
assert.ok(
  ["hold-for-transfer-evidence", "quarantine-from-review-packet"].includes(broadClaim.decision),
  "broad claim should be held or quarantined until transfer evidence exists"
);
assert.ok(
  broadClaim.findings.some((finding) => finding.rule === "population-transfer-gap"),
  "broad claim should flag missing population transfer evidence"
);
assert.ok(
  broadClaim.findings.some((finding) => finding.rule === "no-external-validation"),
  "broad claim should require external validation"
);

const reproducibleClaim = packet.claimReviews.find((review) => review.id === "claim-reproducible-pipeline");
assert.ok(reproducibleClaim.score > broadClaim.score, "reproducible claim should score better than broad claim");
assert.strictEqual(reproducibleClaim.observedScope.externalValidation, true);
assert.strictEqual(reproducibleClaim.observedScope.runnableEvidence, true);

const emptyClaim = {
  id: "claim-empty",
  text: "The model works for every lab.",
  assertedScope: {
    populations: ["adult"],
    settings: ["international site"],
    instruments: ["bulk-rna-seq"],
    environments: ["python-3.11"]
  },
  evidenceIds: [],
  confidence: "strong"
};
const emptyReview = evaluateClaim(emptyClaim, project.evidence, project.manuscript);
assert.strictEqual(emptyReview.decision, "quarantine-from-review-packet");
assert.ok(emptyReview.findings.some((finding) => finding.rule === "missing-evidence"));

const unresolvedReview = evaluateClaim(
  {
    id: "claim-broken-links",
    text: "The model transfers to a community setting.",
    assertedScope: { populations: ["adult"], settings: ["community hospital"] },
    evidenceIds: ["external-adult-validation", "missing-validation-packet"],
    confidence: "strong"
  },
  project.evidence,
  project.manuscript
);
assert.ok(
  unresolvedReview.findings.some((finding) => finding.rule === "unresolved-evidence-links"),
  "missing referenced evidence should be an explicit blocking finding"
);

const malformedReview = evaluateClaim(
  { id: "claim-malformed", text: "No evidence list was supplied.", assertedScope: {} },
  null,
  { requiredSubgroups: [] }
);
assert.strictEqual(malformedReview.decision, "quarantine-from-review-packet");
assert.ok(malformedReview.findings.some((finding) => finding.rule === "missing-evidence"));

const duplicateEvidenceReview = evaluateClaim(
  {
    id: "claim-ambiguous-evidence",
    text: "The result transfers to adult patients.",
    assertedScope: { populations: ["adult"] },
    evidenceIds: ["duplicate-evidence"],
    confidence: "moderate"
  },
  [
    { id: "duplicate-evidence", population: "adult", environment: "node", reproducible: true },
    { id: "duplicate-evidence", population: "adult", environment: "node", reproducible: true }
  ],
  { requiredSubgroups: [] }
);
assert.strictEqual(duplicateEvidenceReview.decision, "quarantine-from-review-packet");
assert.ok(
  duplicateEvidenceReview.findings.some((finding) => finding.rule === "ambiguous-evidence-identifiers"),
  "duplicate evidence identifiers should be treated as a critical ambiguity"
);

const emptyPacket = buildReviewPacket({ id: "empty-project", manuscript: {} });
assert.strictEqual(emptyPacket.averageScore, 0);
assert.strictEqual(emptyPacket.decision, "quarantine-from-review-packet");
assert.deepStrictEqual(emptyPacket.claimReviews, []);

const maskingProject = {
  id: "masking-project",
  title: "Critical claim masking regression",
  manuscript: {
    requiredSubgroups: [],
    claims: [
      { id: "unsupported", text: "Unsupported claim", assertedScope: {}, evidenceIds: [] },
      ...[1, 2, 3, 4].map((index) => ({
        id: `supported-${index}`,
        text: `Supported claim ${index}`,
        assertedScope: { populations: ["adult"] },
        evidenceIds: ["valid-evidence"]
      }))
    ]
  },
  evidence: [
    {
      id: "valid-evidence",
      population: "adult",
      environment: "node",
      reproducible: true,
      externalValidation: true
    }
  ]
};
const maskingPacket = buildReviewPacket(maskingProject);
assert.ok(maskingPacket.averageScore >= 82, "fixture should prove the average alone appears review-ready");
assert.strictEqual(
  maskingPacket.decision,
  "quarantine-from-review-packet",
  "one critical claim must not be hidden by a high packet average"
);

const markdown = renderMarkdownReport(packet);
assert.ok(markdown.includes("## Claim Reviews"));
assert.ok(markdown.includes("## Research Gap Prompts"));

const svg = renderSvgSummary(packet);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("External Validity Transfer Assistant"));
assert.strictEqual(escapeXml('claim<&"\''), "claim&lt;&amp;&quot;&apos;");
assert.ok(renderSvgSummary({ ...packet, claimReviews: [{ ...packet.claimReviews[0], id: "claim<unsafe>" }] }).includes("claim&lt;unsafe&gt;"));

console.log("external-validity-transfer-assistant tests passed");
