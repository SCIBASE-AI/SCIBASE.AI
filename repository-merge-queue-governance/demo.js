"use strict";

const { evaluateMergeQueue } = require("./index");

const report = evaluateMergeQueue({
  mergeRequests: [
    {
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
        { path: "manuscript/main.md", sizeBytes: 24000, contentHash: "sha256:manuscript" },
        { path: "data/counts.parquet", sizeBytes: 22000000, contentHash: "sha256:data", lfsPointer: true },
        {
          path: "results/figure-2.png",
          sizeBytes: 360000,
          contentHash: "sha256:figure",
          generated: true,
          generatorDigest: "sha256:notebook-run",
        },
        { path: "metadata.json", sizeBytes: 3200, contentHash: "sha256:metadata" },
      ],
    },
    {
      id: "MR-2026-HOLD",
      sourceBranch: "fork/clinical-reanalysis",
      targetBranch: "main",
      authorId: "researcher-2",
      baseUpdatedAt: "2026-04-20",
      changedComponents: ["data", "notebooks"],
      approvals: [{ userId: "reviewer-2", role: "reviewer" }],
      unresolvedThreads: 2,
      forkOf: "external/clinical-pilot",
      reproducibilityEvidence: { pipelineId: "clinical-replay", status: "failed" },
      files: [{ path: "data/raw.csv", sizeBytes: 18000000, contentHash: "sha256:raw" }],
    },
    {
      targetBranch: "main",
      authorId: "",
      changedComponents: [],
      approvals: [],
      unresolvedThreads: 0,
      files: [{ sizeBytes: -1 }],
    },
  ],
});

console.log("Repository Merge Queue Governance Demo");
console.log("======================================");
console.log(`merge requests: ${report.mergeRequestCount}`);
console.log(`ready: ${report.totals.readyCount}, held: ${report.totals.heldCount}, blocked: ${report.totals.blockedCount}`);
console.log(`files reviewed: ${report.totals.files}`);
console.log(`large files: ${report.totals.largeFiles}`);
console.log(`audit digest: ${report.auditDigest.slice(0, 16)}...`);

for (const evaluation of report.evaluations) {
  console.log(`- ${evaluation.mergeRequestId || "(missing-id)"}: ${evaluation.status}, version impact ${evaluation.semanticVersionImpact}`);
}
