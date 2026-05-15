const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  createReplayLedger,
  digest,
  stableStringify,
  validateRepositoryManifest
} = require("../src/replay-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-repository.json");

function loadSample() {
  return JSON.parse(fs.readFileSync(samplePath, "utf8"));
}

function findComponent(manifest, id) {
  return manifest.components.find((component) => component.id === id);
}

test("detects stale scientific outputs after data, code, notebook, and environment changes", () => {
  const ledger = createReplayLedger(loadSample());
  const figureFinding = ledger.findings.find((finding) => finding.resultId === "result.figure-1a");

  assert.equal(ledger.releaseDecision, "block-release");
  assert.equal(figureFinding.severity, "block-release");
  assert.deepEqual(
    figureFinding.staleDependencies.map((dependency) => dependency.id).sort(),
    ["code.normalizer", "data.raw-counts", "env.analysis", "notebook.run-analysis"]
  );
  assert.match(figureFinding.currentReplayDigest, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(figureFinding.currentReplayDigest, figureFinding.recordedReplayDigest);
});

test("flags failed replay runs even when dependency hashes match", () => {
  const ledger = createReplayLedger(loadSample());
  const qcFinding = ledger.findings.find((finding) => finding.resultId === "result.qc-table");

  assert.equal(qcFinding.severity, "block-release");
  assert.equal(qcFinding.staleDependencies.length, 0);
  assert.equal(qcFinding.problems.some((problem) => problem.code === "failed-replay"), true);
});

test("keeps current replayed outputs out of the findings list", () => {
  const ledger = createReplayLedger(loadSample());

  assert.equal(
    ledger.findings.some((finding) => finding.resultId === "result.model-metrics"),
    false
  );
});

test("builds rollback packets and citation impacts for reviewer workflow", () => {
  const ledger = createReplayLedger(loadSample());

  assert.equal(ledger.rollbackPackets.length, ledger.findings.length);
  assert.equal(
    ledger.rollbackPackets.some((packet) => packet.rollbackTarget.endsWith(":results/figure-1a.png")),
    true
  );
  assert.deepEqual(
    ledger.citationImpacts.map((impact) => impact.resultId),
    ["result.figure-1a"]
  );
});

test("reports ready when all release-critical results are current and replayed", () => {
  const manifest = loadSample();
  const result = findComponent(manifest, "result.figure-1a");
  result.lastReplayedAt = "2026-05-14T10:20:00Z";
  result.recordedDependencyHashes = {
    "data.raw-counts": "sha256:data-raw-counts-v4",
    "code.normalizer": "sha256:normalizer-v5",
    "code.plotter": "sha256:plotter-v2",
    "notebook.run-analysis": "sha256:run-analysis-v7",
    "env.analysis": "sha256:conda-analysis-2026-05-14"
  };

  const qcResult = findComponent(manifest, "result.qc-table");
  qcResult.status = "passed";
  delete qcResult.failureReason;

  const ledger = createReplayLedger(manifest);

  assert.equal(ledger.releaseDecision, "ready");
  assert.equal(ledger.summary.releaseBlockingArtifacts, 0);
});

test("validates repository manifest shape", () => {
  const manifest = loadSample();
  manifest.components = manifest.components.filter((component) => component.kind !== "metadata");

  const errors = validateRepositoryManifest(manifest);

  assert.equal(errors.some((error) => error.includes("metadata component")), true);
});

test("uses deterministic stable digests for audit records", () => {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };

  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(digest(left), digest(right));
  assert.match(digest(left), /^sha256:[a-f0-9]{64}$/);
});
