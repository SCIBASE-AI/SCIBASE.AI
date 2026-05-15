const assert = require("assert");
const {
  buildGovernancePacket,
  detectArtifactType,
  detectEnvironmentDrift,
  evaluateArtifact,
  fingerprintEnvironment,
  scoreFairMetadata,
  sha256,
  stableStringify,
} = require("./src");
const { sampleProject } = require("./src/sample-data");

function testStableHashing() {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };

  assert.strictEqual(stableStringify(left), stableStringify(right));
  assert.strictEqual(sha256(left), sha256(right));
}

function testArtifactTypeDetection() {
  assert.strictEqual(detectArtifactType("analysis.ipynb"), "code/notebook");
  assert.strictEqual(detectArtifactType("dataset.csv"), "dataset/tabular");
  assert.strictEqual(detectArtifactType("figure.svg"), "image");
}

function testEnvironmentFingerprinting() {
  const a = fingerprintEnvironment({
    baseImage: "python:3.12@sha256:abc",
    packages: { pandas: "2.2.2", numpy: "1.26.4" },
  });
  const b = fingerprintEnvironment({
    packages: { numpy: "1.26.4", pandas: "2.2.2" },
    baseImage: "python:3.12@sha256:abc",
  });

  assert.strictEqual(a.digest, b.digest);
}

function testEnvironmentDriftBlocksUnpinnedLatest() {
  const mlEnv = sampleProject.environments.find((environment) => environment.id === "env:ml-training");
  const drift = detectEnvironmentDrift(mlEnv);

  assert.strictEqual(drift.status, "BLOCKED");
  assert.ok(drift.findings.some((finding) => finding.type === "base_image_unpinned"));
  assert.ok(drift.findings.some((finding) => finding.type === "dependency_unpinned"));
}

function testFairScoringAndRestrictedArtifactBlock() {
  const envs = new Map(sampleProject.environments.map((environment) => [environment.id, environment]));
  const clinical = sampleProject.artifacts.find((artifact) => artifact.id === "artifact:clinical-supplement");
  const fair = scoreFairMetadata(clinical);
  const evaluation = evaluateArtifact(clinical, envs, sampleProject.retentionPolicy);

  assert.ok(fair.score < 1);
  assert.strictEqual(evaluation.status, "BLOCKED");
  assert.ok(evaluation.reasons.some((reason) => reason.type === "restricted_artifact_missing_license"));
}

function testPacketSummaryAndRerunDecisions() {
  const packet = buildGovernancePacket(sampleProject);

  assert.strictEqual(packet.summary.artifacts, 3);
  assert.strictEqual(packet.summary.environments, 2);
  assert.strictEqual(packet.summary.rerunTriggers, 2);
  assert.strictEqual(packet.summary.runnableNow, 1);
  assert.strictEqual(packet.summary.blockedReruns, 1);

  const weekly = packet.reruns.find((rerun) => rerun.triggerId === "trigger:weekly-figures");
  const modelRefresh = packet.reruns.find((rerun) => rerun.triggerId === "trigger:model-refresh");

  assert.strictEqual(weekly.action, "RUN_NOW");
  assert.strictEqual(modelRefresh.action, "BLOCKED");
  assert.ok(modelRefresh.reasons.some((reason) => reason.type === "artifact_blocked"));
  assert.ok(modelRefresh.reasons.some((reason) => reason.type === "environment_drift_blocked"));
}

function testRetentionAndRequirementEvidence() {
  const packet = buildGovernancePacket(sampleProject);
  const rawAssay = packet.retentionAndExport.find((item) => item.artifactId === "artifact:raw-assay-csv");
  const clinical = packet.retentionAndExport.find((item) => item.artifactId === "artifact:clinical-supplement");

  assert.strictEqual(rawAssay.exportEligible, true);
  assert.strictEqual(rawAssay.doiReady, true);
  assert.strictEqual(clinical.exportEligible, false);
  assert.strictEqual(clinical.retentionDays, sampleProject.retentionPolicy.regulatedRetentionDays);
  assert.ok(packet.requirementMap.length >= 6);
}

const tests = [
  testStableHashing,
  testArtifactTypeDetection,
  testEnvironmentFingerprinting,
  testEnvironmentDriftBlocksUnpinnedLatest,
  testFairScoringAndRestrictedArtifactBlock,
  testPacketSummaryAndRerunDecisions,
  testRetentionAndRequirementEvidence,
];

tests.forEach((test) => test());
console.log(`${tests.length} tests passed`);
