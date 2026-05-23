const assert = require("assert");

const {
  evaluateClaimFreshness,
  evaluateFreshnessReview,
  renderMarkdown,
  renderSvg
} = require("./index");
const {
  freshnessPolicy,
  evidenceLedger,
  manuscriptPackets
} = require("./sample-data");

const report = evaluateFreshnessReview(manuscriptPackets, evidenceLedger, freshnessPolicy);

assert.strictEqual(report.aggregate.reviewedManuscripts, 2);
assert.strictEqual(report.aggregate.heldManuscripts, 1);
assert.strictEqual(report.aggregate.readyManuscripts, 1);
assert.strictEqual(report.aggregate.criticalFindings, 1);
assert.ok(report.aggregate.majorFindings >= 4);

const held = report.manuscripts.find((entry) => entry.packetId === "ms-hold-senolytic-review");
assert.ok(held);
assert.strictEqual(held.summary.status, "hold_freshness_review");
assert.ok(held.findings.some((finding) => finding.code === "NEWER_CONTRADICTORY_EVIDENCE"));
assert.ok(held.findings.some((finding) => finding.code === "MISSING_NEWER_EVIDENCE"));
assert.ok(held.findings.some((finding) => finding.code === "DATASET_VERSION_DRIFT"));
assert.ok(held.findings.some((finding) => finding.code === "BENCHMARK_VERSION_DRIFT"));
assert.ok(held.reviewerActions.length >= 4);

const versionedHistoricalClaim = evaluateClaimFreshness(
  {
    id: "claim-versioned-historical",
    topic: "single-cell atlas normalization",
    citationDates: ["2026-04-01"],
    citedCurrentSignalIds: ["ev-data-2026-single-cell-atlas-v4"],
    datasetVersion: "v2.1",
    tone: "versioned historical comparison"
  },
  evidenceLedger,
  freshnessPolicy
);
assert.ok(!versionedHistoricalClaim.some((finding) => finding.code === "DATASET_VERSION_DRIFT"));

const unsupportedEvidenceType = evaluateClaimFreshness(
  {
    id: "claim-unsupported-signal",
    topic: "unsupported freshness source",
    citationDates: ["2026-04-01"],
    citedCurrentSignalIds: [],
    tone: "current"
  },
  {
    signals: [
      {
        id: "ev-blog-2026",
        topic: "unsupported freshness source",
        evidenceType: "blog_post",
        title: "Unsupported freshness blog",
        published: "2026-05-01",
        relation: "updates",
        requirement: "Do not use unsupported evidence types for policy-driven freshness holds."
      }
    ]
  },
  freshnessPolicy
);
assert.deepStrictEqual(unsupportedEvidenceType.map((finding) => finding.code), ["FRESHNESS_READY"]);

const invalidDateClaim = evaluateClaimFreshness(
  {
    id: "claim-invalid-date",
    topic: "invalid dates",
    citationDates: ["2026-99-99", "not-a-date"],
    citedCurrentSignalIds: [],
    tone: "current"
  },
  { signals: [] },
  freshnessPolicy
);
assert.ok(invalidDateClaim.some((finding) => finding.code === "INVALID_SUPPORT_DATE"));
assert.ok(invalidDateClaim.some((finding) => finding.code === "NO_SUPPORT_DATES"));

const ready = report.manuscripts.find((entry) => entry.packetId === "ms-ready-telemetry-review");
assert.ok(ready);
assert.strictEqual(ready.summary.status, "ready_for_review");
assert.deepStrictEqual(ready.findings.map((finding) => finding.code), ["FRESHNESS_READY"]);

const secondPass = evaluateFreshnessReview(manuscriptPackets, evidenceLedger, freshnessPolicy);
assert.strictEqual(secondPass.auditDigest, report.auditDigest);

const markdown = renderMarkdown(report);
assert.ok(markdown.includes("Literature Freshness Review Assistant"));
assert.ok(markdown.includes("NEWER_CONTRADICTORY_EVIDENCE"));

const escapedMarkdown = renderMarkdown({
  policy: freshnessPolicy,
  auditDigest: "digest",
  aggregate: {
    reviewedManuscripts: 1,
    heldManuscripts: 0,
    revisionManuscripts: 1,
    readyManuscripts: 0,
    criticalFindings: 0,
    majorFindings: 1,
    actionableFindings: 1
  },
  manuscripts: [
    {
      title: "Escaping packet",
      summary: { status: "revise_freshness_context" },
      auditDigest: "entry",
      findings: [
        {
          severity: "major",
          code: "TABLE_ESCAPE",
          claimId: "claim-table",
          detail: "Evidence title A | B\nsecond line",
          requiredAction: "Replace A | B with a current source"
        }
      ],
      researchGapPrompts: []
    }
  ]
});
assert.ok(escapedMarkdown.includes("A \\| B<br>second line"));
assert.ok(escapedMarkdown.includes("Replace A \\| B"));

const svg = renderSvg(report);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Literature freshness review assistant"));

console.log("literature freshness review assistant tests passed");
