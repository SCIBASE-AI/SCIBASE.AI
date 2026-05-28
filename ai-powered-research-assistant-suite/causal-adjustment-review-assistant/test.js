const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditCausalAdjustment, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeReadyPacket() {
  const packet = clone(samplePacket);
  packet.studyDesign.type = "target_trial_emulation";
  packet.analysisPlan.adjustedCovariates = ["baseline-severity", "age", "comorbidity-index"];
  packet.analysisPlan.reportedStrata = ["site-region"];
  packet.claims = [
    {
      id: "claim-primary-associated",
      type: "association",
      text: "Early immunotherapy was associated with lower 90-day mortality in the adjusted target-trial analysis.",
      evidenceIds: ["table-2", "figure-3"],
    },
  ];
  packet.temporalChecks = packet.temporalChecks.map((check) => ({ ...check, passes: true, observed: check.expected }));
  packet.diagnostics.minPropensity = 0.12;
  packet.diagnostics.maxPropensity = 0.87;
  packet.diagnostics.balance = packet.diagnostics.balance.map((balance) => ({ ...balance, standardizedMeanDifference: 0.08 }));
  packet.diagnostics.negativeControls = packet.diagnostics.negativeControls.map((control) => ({
    ...control,
    effectEstimate: 0.01,
    pValue: 0.78,
  }));
  packet.instrumentChecks = [];
  return packet;
}

function codes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

const report = auditCausalAdjustment(samplePacket);
const findingCodes = codes(report);
assert.strictEqual(report.decision, "hold-causal-claim");
assert.strictEqual(report.riskScore, 100);
assert(findingCodes.has("MISSING_CONFOUNDER_ADJUSTMENT"));
assert(findingCodes.has("COLLIDER_ADJUSTMENT"));
assert(findingCodes.has("POST_TREATMENT_ADJUSTMENT"));
assert(findingCodes.has("TEMPORAL_ORDER_VIOLATION"));
assert(findingCodes.has("POSITIVITY_VIOLATION"));
assert(findingCodes.has("NEGATIVE_CONTROL_FAILURE"));
assert(findingCodes.has("INVALID_INSTRUMENT"));
assert(findingCodes.has("EFFECT_MODIFIER_UNREPORTED"));
assert(findingCodes.has("UNSUPPORTED_CAUSAL_LANGUAGE"));
assert(findingCodes.has("WEAK_BALANCE_DIAGNOSTIC"));

const repeatedReport = auditCausalAdjustment(samplePacket);
assert.strictEqual(report.evidenceDigest, repeatedReport.evidenceDigest, "audit digest should be deterministic");

const readyReport = auditCausalAdjustment(makeReadyPacket());
assert.strictEqual(readyReport.decision, "ready-for-causal-language");
assert.strictEqual(readyReport.findingCount, 0);
assert.strictEqual(readyReport.riskScore, 0);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "causal-adjustment-assistant-"));
const paths = writeAuditReports(report, tempDir);
for (const outputPath of Object.values(paths)) {
  assert(fs.existsSync(outputPath), `expected report at ${outputPath}`);
}
assert(fs.readFileSync(paths.markdownPath, "utf8").includes("Causal Adjustment Review"));

console.log("causal-adjustment-review-assistant tests passed");
