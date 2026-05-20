const assert = require("assert");
const {
  buildAudit,
  compareSchemas,
  evaluateConsumerCompatibility
} = require("./index");
const {
  previousVersion,
  nextVersion,
  consumers
} = require("./sample-data");

function runTests() {
  const findings = compareSchemas(previousVersion, nextVersion);
  assert(findings.some((finding) => finding.kind === "renamed_field" && finding.field === "donor_group"));
  assert(findings.some((finding) => finding.kind === "unit_change" && finding.field === "dose_ug"));
  assert(findings.some((finding) => finding.kind === "type_change" && finding.field === "response_score"));
  assert(findings.some((finding) => finding.kind === "added_field" && finding.field === "instrument_batch"));

  const compatibility = evaluateConsumerCompatibility(consumers, nextVersion, findings);
  const preview = compatibility.find((consumer) => consumer.id === "preview-table-v2");
  const api = compatibility.find((consumer) => consumer.id === "public-api-normalized-response");
  const rerun = compatibility.find((consumer) => consumer.id === "notebook-rerun-dose-response");

  assert.strictEqual(preview.decision, "review");
  assert.strictEqual(api.decision, "hold");
  assert.strictEqual(rerun.decision, "hold");
  assert(api.issues.some((issue) => issue.field === "response_score"));

  const audit = buildAudit(previousVersion, nextVersion, consumers);
  assert.strictEqual(audit.decision, "hold-for-migration");
  assert(audit.compatibilityScore < 100);
  assert(audit.metadataUpdates.datacite.descriptions[0].description.includes("Schema evolution review"));
  assert(audit.metadataUpdates.schemaOrg.variableMeasured.some((variable) => variable.name === "dose_ug"));
  assert(audit.reviewerActions.some((action) => action.includes("Hold automatic publication")));

  const compatibleNext = {
    ...previousVersion,
    version: "2026.04.1",
    schema: previousVersion.schema.concat([
      { name: "optional_note", type: "string", role: "note", required: false, nullable: true }
    ])
  };
  const compatibleAudit = buildAudit(previousVersion, compatibleNext, consumers);
  assert.strictEqual(compatibleAudit.decision, "compatible");

  console.log("dataset-schema-evolution-gate tests passed");
}

runTests();
