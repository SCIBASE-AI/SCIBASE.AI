const assert = require("node:assert/strict")
const { evaluateColumnSensitivityRelease } = require("./index")
const { datasets, policy } = require("./sample-data")

const packet = evaluateColumnSensitivityRelease({
  asOf: "2026-05-23T22:25:00.000Z",
  datasets,
  policy,
})

assert.equal(packet.summary.totalDatasets, 3)
assert.equal(packet.summary.readyDatasets, 1)
assert.equal(packet.summary.reviewDatasets, 1)
assert.equal(packet.summary.blockedDatasets, 1)
assert.equal(packet.releaseQueue.length, 1)
assert.equal(packet.releaseQueue[0].datasetId, "metabolomics-public-release")
assert.equal(packet.holdQueue.length, 2)

const ready = packet.datasets.find((dataset) => dataset.datasetId === "metabolomics-public-release")
assert.equal(ready.status, "release_ready")
assert(ready.checks.every((check) => check.pass))

const blocked = packet.datasets.find((dataset) => dataset.datasetId === "clinical-screening-export")
assert.equal(blocked.status, "release_blocked")
assert(blocked.findings.some((finding) => finding.code === "direct_identifiers_transformed"))
assert(blocked.findings.some((finding) => finding.code === "quasi_identifier_k_anonymity_met"))
assert(blocked.findings.some((finding) => finding.code === "free_text_review_attested"))
assert(blocked.findings.some((finding) => finding.code === "location_precision_safe"))
assert(blocked.findings.some((finding) => finding.code === "data_steward_approval_present"))
assert(blocked.findings.some((finding) => finding.code === "public_sensitive_column_budget"))

const direct = blocked.findings.find((finding) => finding.code === "direct_identifiers_transformed")
assert.deepEqual(direct.evidence.columns.map((column) => column.columnId), ["participant_email"])

const review = packet.datasets.find((dataset) => dataset.datasetId === "survey-free-text-review")
assert.equal(review.status, "release_review")
assert.equal(review.findings.length, 1)
assert.equal(review.findings[0].code, "free_text_review_attested")
assert.deepEqual(review.findings[0].evidence.columns, [{ columnId: "open_response", reviewStatus: "pending" }])

const repeated = evaluateColumnSensitivityRelease({
  asOf: "2026-05-23T22:25:00.000Z",
  datasets,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

const malformedDataset = evaluateColumnSensitivityRelease({
  asOf: "2026-05-23T22:25:00.000Z",
  datasets: [null],
  policy,
})
assert.equal(malformedDataset.summary.blockedDatasets, 1)
assert.equal(malformedDataset.datasets[0].datasetId, "unidentified-dataset")
assert.equal(malformedDataset.datasets[0].findings[0].code, "dataset_evidence_well_formed")
assert.equal(malformedDataset.holdQueue[0].action, "block_release_until_sensitivity_fixed")

const malformedColumn = evaluateColumnSensitivityRelease({
  asOf: "2026-05-23T22:25:00.000Z",
  datasets: [{
    datasetId: "malformed-column-release",
    title: "Malformed column release",
    releaseModes: ["public_preview"],
    columns: [null, {
      columnId: "safe_count",
      label: "Safe Count",
      sensitivityType: "aggregate_count",
    }],
  }],
  policy,
})
assert.equal(malformedColumn.summary.blockedDatasets, 1)
assert.equal(malformedColumn.datasets[0].findings[0].code, "column_evidence_well_formed")
assert.deepEqual(malformedColumn.datasets[0].findings[0].evidence.malformedColumns, [{
  columnId: "column-0",
  index: 0,
  receivedType: "null",
}])

console.log("column sensitivity release gate tests passed")
