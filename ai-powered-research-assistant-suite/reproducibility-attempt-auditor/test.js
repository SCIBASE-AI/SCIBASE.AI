const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditReproducibility, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeReviewReadyPacket() {
  const packet = clone(samplePacket);
  for (const dataset of packet.datasets) {
    dataset.available = true;
    dataset.observedDigest = dataset.expectedDigest;
    dataset.access = "repository";
    delete dataset.unavailableReason;
  }
  for (const dependency of packet.environments[0].declaredDependencies) {
    dependency.pinned = true;
    if (dependency.version === "latest") dependency.version = "1.0.0";
  }

  const artifactDigests = Object.fromEntries(packet.expectedArtifacts.map((artifact) => [artifact.id, artifact.expectedDigest]));
  const datasetDigests = Object.fromEntries(packet.datasets.map((dataset) => [dataset.id, dataset.expectedDigest]));
  const outputs = { metrics: { hazardRatio: 0.74, cIndex: 0.81 } };
  packet.attempts = [
    {
      id: "attempt-clean-a",
      status: "success",
      completedAt: "2026-05-27T18:00:00.000Z",
      environmentId: "renv-r-survival-2026",
      environmentLockDigest: "sha256:renv-lock-2026-05-20",
      datasetDigests,
      artifactDigests,
      outputs,
      requiresSeed: true,
      seed: 42,
    },
    {
      id: "attempt-clean-b",
      status: "success",
      completedAt: "2026-05-28T18:00:00.000Z",
      environmentId: "renv-r-survival-2026",
      environmentLockDigest: "sha256:renv-lock-2026-05-20",
      datasetDigests,
      artifactDigests,
      outputs,
      requiresSeed: true,
      seed: 43,
    },
  ];
  packet.priorAttempts = [
    {
      id: "external-reviewer-2026-05-18",
      status: "failed",
      reviewer: "journal-reviewer-2",
      reason: "initial cohort link was expired",
      resolvedBy: "attempt-clean-a",
    },
  ];
  return packet;
}

function codes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

const report = auditReproducibility(samplePacket);
const findingCodes = codes(report);
assert.strictEqual(report.decision, "hold-public-release");
assert(report.confidenceScore < 35, `expected low confidence, got ${report.confidenceScore}`);
assert(findingCodes.has("MISSING_RAW_DATA"));
assert(findingCodes.has("DATASET_DIGEST_MISMATCH"));
assert(findingCodes.has("MISSING_TEST_SET"));
assert(findingCodes.has("DEPENDENCY_LOCK_DRIFT"));
assert(findingCodes.has("UNPINNED_DEPENDENCY"));
assert(findingCodes.has("OUTPUT_ARTIFACT_DIGEST_MISMATCH"));
assert(findingCodes.has("RESULT_MISMATCH"));
assert(findingCodes.has("RUN_VARIANCE_EXCEEDS_TOLERANCE"));
assert(findingCodes.has("MISSING_RANDOM_SEED"));
assert(findingCodes.has("PRIOR_REPRO_FAILURE"));

const repeatedReport = auditReproducibility(samplePacket);
assert.strictEqual(report.evidenceDigest, repeatedReport.evidenceDigest, "audit digest should be deterministic");

const readyReport = auditReproducibility(makeReviewReadyPacket());
assert.strictEqual(readyReport.decision, "ready-for-release");
assert.strictEqual(readyReport.findingCount, 0);
assert.strictEqual(readyReport.confidenceScore, 100);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "repro-attempt-auditor-"));
const paths = writeAuditReports(report, tempDir);
for (const outputPath of Object.values(paths)) {
  assert(fs.existsSync(outputPath), `expected report at ${outputPath}`);
}
assert(fs.readFileSync(paths.markdownPath, "utf8").includes("Reproducibility Attempt Audit"));

console.log("reproducibility-attempt-auditor tests passed");
