"use strict";

const assert = require("assert/strict");
const { evaluateMergeQueue } = require("./index");

function baseMergeRequest(overrides = {}) {
  return {
    id: "MR-2026-001",
    sourceBranch: "experiment/rna-seq-refresh",
    targetBranch: "main",
    authorId: "researcher-1",
    baseUpdatedAt: "2026-05-18",
    changedComponents: ["manuscript", "data", "code", "metadata"],
    approvals: [
      { userId: "admin-1", role: "admin" },
      { userId: "reviewer-1", role: "reviewer" },
    ],
    unresolvedThreads: 0,
    forkOf: "lab-a/original-rna-study",
    forkAttributionId: "ATTR-FORK-001",
    citationImpactNote: "Metadata updates add new funder and dataset DOI.",
    reproducibilityEvidence: {
      pipelineId: "replay-rna-2026-05",
      status: "passed",
      artifactDigest: "sha256:replay-good",
    },
    files: [
      {
        path: "manuscript/main.md",
        sizeBytes: 24000,
        contentHash: "sha256:manuscript",
      },
      {
        path: "data/counts.parquet",
        sizeBytes: 22000000,
        contentHash: "sha256:data",
        lfsPointer: true,
      },
      {
        path: "results/figure-2.png",
        sizeBytes: 360000,
        contentHash: "sha256:figure",
        generated: true,
        generatorDigest: "sha256:notebook-run",
      },
      {
        path: "metadata.json",
        sizeBytes: 3200,
        contentHash: "sha256:metadata",
      },
    ],
    ...overrides,
  };
}

{
  const report = evaluateMergeQueue({ mergeRequests: [baseMergeRequest()] });
  const evaluation = report.evaluations[0];

  assert.equal(report.mergeRequestCount, 1);
  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.approvalsSatisfied.length, 2);
  assert.equal(evaluation.fileSummary.largeFileCount, 1);
  assert.equal(evaluation.semanticVersionImpact, "minor");
  assert.match(evaluation.auditDigest, /^[a-f0-9]{64}$/);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const first = evaluateMergeQueue({ mergeRequests: [baseMergeRequest()] });
  const second = evaluateMergeQueue({ mergeRequests: [baseMergeRequest()] });

  assert.equal(first.auditDigest, second.auditDigest);
}

{
  const report = evaluateMergeQueue({
    mergeRequests: [
      baseMergeRequest({
        approvals: [{ userId: "researcher-1", role: "admin" }],
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "held");
  assert.ok(findings.includes("self_approval"));
  assert.ok(findings.includes("missing_required_approval"));
}

{
  const report = evaluateMergeQueue({
    mergeRequests: [
      baseMergeRequest({
        baseUpdatedAt: "2026-04-20",
        unresolvedThreads: 2,
        forkAttributionId: undefined,
        reproducibilityEvidence: { pipelineId: "replay", status: "failed" },
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "held");
  assert.ok(findings.includes("stale_base_branch"));
  assert.ok(findings.includes("unresolved_review_threads"));
  assert.ok(findings.includes("missing_fork_attribution"));
  assert.ok(findings.includes("missing_reproducibility_evidence"));
}

{
  const report = evaluateMergeQueue({
    mergeRequests: [
      baseMergeRequest({
        files: [
          {
            path: "data/raw.csv",
            sizeBytes: 15000000,
            contentHash: "sha256:raw",
          },
          {
            path: "results/plot.png",
            sizeBytes: 80000,
            contentHash: "sha256:plot",
            generated: true,
          },
          {
            path: "code/run.py",
            sizeBytes: 7000,
          },
        ],
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "held");
  assert.ok(findings.includes("large_file_without_lfs"));
  assert.ok(findings.includes("missing_generator_digest"));
  assert.ok(findings.includes("missing_content_hash"));
}

{
  const report = evaluateMergeQueue({
    mergeRequests: [
      baseMergeRequest({
        id: undefined,
        sourceBranch: undefined,
        authorId: undefined,
        files: [{ sizeBytes: -1 }],
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "blocked");
  assert.ok(findings.includes("missing_merge_request_id"));
  assert.ok(findings.includes("missing_branch_reference"));
  assert.ok(findings.includes("missing_author"));
  assert.ok(findings.includes("missing_file_path"));
  assert.ok(findings.includes("invalid_file_size"));
}

{
  assert.throws(
    () =>
      evaluateMergeQueue({
        mergeRequests: [baseMergeRequest({ baseUpdatedAt: "not-a-date" })],
      }),
    /Invalid date range/
  );
}

console.log("repository-merge-queue-governance tests passed");
