const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditSingleCellBatchEffects, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeReadyPacket() {
  const packet = clone(samplePacket);
  packet.experimentalDesign.donorsByCondition = { control: 4, disease: 4 };
  packet.samples = [
    { id: "ctrl-01", condition: "control", donorId: "D-001", batch: "mixed-a", cells: 3100, doubletDetectionRun: true, doubletRate: 0.04 },
    { id: "ctrl-02", condition: "control", donorId: "D-002", batch: "mixed-b", cells: 2900, doubletDetectionRun: true, doubletRate: 0.03 },
    { id: "ctrl-03", condition: "control", donorId: "D-003", batch: "mixed-c", cells: 3300, doubletDetectionRun: true, doubletRate: 0.02 },
    { id: "ctrl-04", condition: "control", donorId: "D-004", batch: "mixed-d", cells: 3050, doubletDetectionRun: true, doubletRate: 0.03 },
    { id: "case-01", condition: "disease", donorId: "D-101", batch: "mixed-a", cells: 3400, doubletDetectionRun: true, doubletRate: 0.04 },
    { id: "case-02", condition: "disease", donorId: "D-102", batch: "mixed-b", cells: 3320, doubletDetectionRun: true, doubletRate: 0.05 },
    { id: "case-03", condition: "disease", donorId: "D-103", batch: "mixed-c", cells: 3210, doubletDetectionRun: true, doubletRate: 0.03 },
    { id: "case-04", condition: "disease", donorId: "D-104", batch: "mixed-d", cells: 3480, doubletDetectionRun: true, doubletRate: 0.04 },
  ];
  packet.batchDesign = [
    { id: "library-chemistry", variable: "10x chemistry and run day", conditionCounts: { control: 4, disease: 4 }, conditionAssociation: 0.08, sampleIds: packet.samples.map((sample) => sample.id) },
  ];
  packet.analysisPlan.deModel = "donor_level_pseudobulk_negative_binomial";
  packet.analysisPlan.usesPseudobulk = true;
  packet.analysisPlan.randomEffect = "donor";
  packet.integration.expressionUsedForDE = false;
  packet.integration.conditionPreservationDiagnostic = true;
  packet.integration.silhouetteDelta = 0.04;
  packet.qualityControl = {
    mitochondrialMax: 0.15,
    ribosomalMax: 0.45,
    minGenes: 300,
    maxGenes: 6500,
    minUmi: 800,
    minCellsPerSample: 2500,
  };
  packet.ambientRna.estimatedContamination = 0.03;
  packet.ambientRna.correctionRun = true;
  packet.cellTypeAnnotations = packet.cellTypeAnnotations.map((annotation) => ({
    ...annotation,
    positiveMarkerSupport: 0.82,
    negativeMarkerSupport: 0.74,
    ambiguousLabel: false,
  }));
  packet.clusterStability = packet.clusterStability.map((cluster) => ({
    ...cluster,
    bootstrapJaccard: 0.78,
    resolutionConsistency: 0.75,
  }));
  packet.evidenceItems = [
    {
      id: "ev-pseudobulk-c7",
      type: "pseudobulk_de",
      method: "donor-level negative binomial",
      fdr: 0.018,
      logFoldChange: 0.52,
    },
    ...packet.evidenceItems.filter((item) => item.id !== "ev-cell-level-de"),
  ];
  packet.claims = packet.claims.map((claim) =>
    claim.id === "claim-c7-disease-driver"
      ? { ...claim, text: "A donor-replicated inflammatory microglia state is associated with the disease condition.", evidenceIds: ["ev-pseudobulk-c7", "ev-marker-c7"] }
      : claim,
  );
  packet.reproducibility = {
    rawMatrixAccession: "SYNTH-SCRA-2026",
    analysisCodeAvailable: true,
    pipelineVersion: "scanpy 1.10.2",
    randomSeed: 4242,
    parameterDigest: "sha256:b5e4ca1a0132",
    packageLockDigest: "sha256:23ad90e17954",
  };
  return packet;
}

function codes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

const report = auditSingleCellBatchEffects(samplePacket);
const findingCodes = codes(report);
assert.strictEqual(report.decision, "hold-cell-state-claims");
assert.strictEqual(report.riskScore, 100);
assert(findingCodes.has("BATCH_CONFOUNDED_DESIGN"));
assert(findingCodes.has("DONOR_REPLICATION_GAP"));
assert(findingCodes.has("DOUBLET_BURDEN_UNRESOLVED"));
assert(findingCodes.has("CELL_TYPE_MARKER_WEAK"));
assert(findingCodes.has("INTEGRATION_OVERCORRECTION_RISK"));
assert(findingCodes.has("QC_THRESHOLD_GAP"));
assert(findingCodes.has("AMBIENT_RNA_UNCORRECTED"));
assert(findingCodes.has("CLUSTER_STABILITY_GAP"));
assert(findingCodes.has("DE_OVERCLAIM_UNSUPPORTED"));
assert(findingCodes.has("REPRODUCIBILITY_EVIDENCE_GAP"));

const repeatedReport = auditSingleCellBatchEffects(samplePacket);
assert.strictEqual(report.evidenceDigest, repeatedReport.evidenceDigest, "audit digest should be deterministic");

const readyReport = auditSingleCellBatchEffects(makeReadyPacket());
assert.strictEqual(readyReport.decision, "single-cell-claims-ready");
assert.strictEqual(readyReport.findingCount, 0);
assert.strictEqual(readyReport.riskScore, 0);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "single-cell-batch-review-assistant-"));
const paths = writeAuditReports(report, tempDir);
for (const outputPath of Object.values(paths)) {
  assert(fs.existsSync(outputPath), `expected report at ${outputPath}`);
}
assert(fs.readFileSync(paths.markdownPath, "utf8").includes("Single-Cell Batch Review"));

console.log("single-cell-batch-review-assistant tests passed");
