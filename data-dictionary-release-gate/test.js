const assert = require("node:assert/strict")
const { evaluateDatasetRelease, evaluateReleasePortfolio } = require("./index")
const { datasets, releasePolicy } = require("./sample-data")

const packet = evaluateReleasePortfolio({ datasets, policy: releasePolicy })

assert.equal(packet.summary.totalDatasets, 4)
assert.equal(packet.summary.passed, 1)
assert.equal(packet.summary.revise, 1)
assert.equal(packet.summary.held, 2)
assert.ok(packet.summary.blockers >= 6)
assert.ok(packet.summary.warnings >= 5)
assert.match(packet.audit.digest, /^[a-f0-9]{64}$/)

const clean = packet.decisions.find((decision) => decision.id === "DD-PASS-001")
assert.equal(clean.status, "pass")
assert.equal(clean.findings.length, 0)
assert.equal(clean.reviewerActions[0].code, "APPROVE_DATA_DICTIONARY_RELEASE")

const revise = packet.decisions.find((decision) => decision.id === "DD-REV-002")
assert.equal(revise.status, "revise")
assert.ok(revise.findings.some((finding) => finding.code === "DISCOVERY_METADATA_INCOMPLETE"))
assert.ok(revise.findings.some((finding) => finding.code === "PERSISTENT_IDENTIFIER_MISSING"))
assert.ok(revise.findings.some((finding) => finding.code === "MISSINGNESS_REASON_RECOMMENDED"))

const telemetry = evaluateDatasetRelease(datasets.find((dataset) => dataset.id === "DD-HOLD-003"), releasePolicy)
assert.equal(telemetry.status, "hold")
assert.ok(telemetry.findings.some((finding) => finding.code === "UNDOCUMENTED_COLUMNS"))
assert.ok(telemetry.findings.some((finding) => finding.code === "FILE_CHECKSUM_MISSING"))
assert.ok(telemetry.findings.some((finding) => finding.code === "MEASUREMENT_UNIT_MISSING"))
assert.ok(telemetry.findings.some((finding) => finding.code === "MEASUREMENT_UNIT_NOT_STANDARD"))

const clinical = packet.decisions.find((decision) => decision.id === "DD-HOLD-004")
assert.equal(clinical.status, "hold")
assert.ok(clinical.findings.some((finding) => finding.code === "LICENSE_NOT_RELEASE_READY"))
assert.ok(clinical.findings.some((finding) => finding.code === "SENSITIVE_VARIABLE_RELEASED"))
assert.ok(clinical.reviewerActions.some((action) => action.code === "REMOVE_OR_DEIDENTIFY_SENSITIVE_FIELDS"))

console.log("data-dictionary-release-gate tests passed")
