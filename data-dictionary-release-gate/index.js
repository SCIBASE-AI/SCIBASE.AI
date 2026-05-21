const crypto = require("node:crypto")

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function digestFor(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function finding(code, severity, message, detail = {}) {
  return { code, severity, message, detail }
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0
}

function unique(values) {
  return [...new Set(values)]
}

function isMeasurementVariable(variable) {
  return !["identifier", "category", "text", "boolean"].includes(variable.measurementKind)
}

function evaluateMetadata(dataset, policy) {
  const findings = []
  const { metadata } = dataset

  if (!hasText(metadata.title) || metadata.description.length < policy.minDatasetDescriptionLength) {
    findings.push(finding("DATASET_DESCRIPTION_THIN", "warning", "Dataset title and description need enough context for reuse."))
  }
  if (!policy.approvedLicenses.includes(metadata.license)) {
    findings.push(finding("LICENSE_NOT_RELEASE_READY", "blocker", "Dataset license is missing or not approved for public release.", {
      license: metadata.license || "missing",
    }))
  }
  if (!policy.approvedAccessPolicies.includes(metadata.accessPolicy)) {
    findings.push(finding("ACCESS_POLICY_MISSING", "blocker", "Dataset release needs a declared access policy.", {
      accessPolicy: metadata.accessPolicy || "missing",
    }))
  }
  if (!hasText(metadata.persistentIdentifier)) {
    findings.push(finding("PERSISTENT_IDENTIFIER_MISSING", "warning", "Release metadata should include a DOI, ARK, or planned persistent identifier."))
  }
  if (!hasText(metadata.schemaOrgType) || !Array.isArray(metadata.dataCiteCreators) || metadata.dataCiteCreators.length === 0) {
    findings.push(finding("DISCOVERY_METADATA_INCOMPLETE", "warning", "schema.org and DataCite metadata are incomplete."))
  }

  dataset.files.forEach((file) => {
    if (!hasText(file.checksum)) {
      findings.push(finding("FILE_CHECKSUM_MISSING", "blocker", "Every released file needs a stable checksum.", {
        file: file.path,
      }))
    }
    if (!hasText(file.format)) {
      findings.push(finding("FILE_FORMAT_MISSING", "warning", "File format metadata is missing.", {
        file: file.path,
      }))
    }
  })

  return findings
}

function evaluateColumnCoverage(dataset) {
  const findings = []
  const actualColumns = unique(dataset.files.flatMap((file) => file.columns.map((column) => `${file.path}:${column}`)))
  const actualColumnNames = unique(dataset.files.flatMap((file) => file.columns))
  const documentedNames = unique(dataset.dictionary.map((variable) => variable.name))

  const undocumented = actualColumnNames.filter((column) => !documentedNames.includes(column))
  const orphaned = documentedNames.filter((name) => !actualColumnNames.includes(name))

  if (undocumented.length > 0) {
    findings.push(finding("UNDOCUMENTED_COLUMNS", "blocker", "Release files contain columns missing from the data dictionary.", {
      columns: undocumented,
    }))
  }
  if (orphaned.length > 0) {
    findings.push(finding("ORPHAN_DICTIONARY_ENTRIES", "warning", "Data dictionary contains entries not present in the release files.", {
      variables: orphaned,
    }))
  }
  if (actualColumns.length === 0) {
    findings.push(finding("NO_RELEASE_COLUMNS", "blocker", "No tabular release columns were detected."))
  }

  return findings
}

function evaluateVariable(variable, policy) {
  const findings = []

  if (!hasText(variable.label) || !hasText(variable.description) || variable.description.length < policy.minVariableDescriptionLength) {
    findings.push(finding("VARIABLE_DESCRIPTION_THIN", "warning", "Variable description is too short for independent reuse.", {
      variable: variable.name,
    }))
  }
  if (!hasText(variable.dataType)) {
    findings.push(finding("VARIABLE_TYPE_MISSING", "blocker", "Variable is missing a machine-readable data type.", {
      variable: variable.name,
    }))
  }
  if (isMeasurementVariable(variable)) {
    const allowedUnits = policy.approvedUnitsByKind[variable.measurementKind] || []
    if (!hasText(variable.unit)) {
      findings.push(finding("MEASUREMENT_UNIT_MISSING", "blocker", "Measurement variable is missing units.", {
        variable: variable.name,
        measurementKind: variable.measurementKind,
      }))
    } else if (!allowedUnits.includes(variable.unit)) {
      findings.push(finding("MEASUREMENT_UNIT_NOT_STANDARD", "blocker", "Measurement unit is not approved for this variable kind.", {
        variable: variable.name,
        unit: variable.unit,
        approvedUnits: allowedUnits,
      }))
    }
    if (!hasText(variable.unitStandard)) {
      findings.push(finding("UNIT_STANDARD_MISSING", "warning", "Measurement variable should cite UCUM, SI, or another unit authority.", {
        variable: variable.name,
      }))
    }
  }
  if (variable.dataType === "categorical" && (!Array.isArray(variable.allowedValues) || variable.allowedValues.length === 0)) {
    findings.push(finding("CATEGORICAL_VALUES_MISSING", "warning", "Categorical variable lacks allowed values.", {
      variable: variable.name,
    }))
  }
  if (variable.missingnessRate > policy.maxMissingnessWithoutReason && !hasText(variable.missingnessReason)) {
    findings.push(finding(
      variable.missingnessRate > policy.blockingMissingnessWithoutReason ? "MISSINGNESS_REASON_REQUIRED" : "MISSINGNESS_REASON_RECOMMENDED",
      variable.missingnessRate > policy.blockingMissingnessWithoutReason ? "blocker" : "warning",
      "Variable has unexplained missingness above the policy threshold.",
      { variable: variable.name, missingnessRate: variable.missingnessRate },
    ))
  }
  if (!Array.isArray(variable.semanticTags) || variable.semanticTags.length < policy.minSemanticTagsPerVariable) {
    findings.push(finding("SEMANTIC_TAGS_INCOMPLETE", "warning", "Variable needs richer semantic tags for FAIR discovery.", {
      variable: variable.name,
    }))
  }
  if (!hasText(variable.schemaProperty)) {
    findings.push(finding("SCHEMA_PROPERTY_MISSING", "warning", "Variable lacks a schema.org or domain ontology property mapping.", {
      variable: variable.name,
    }))
  }
  if (policy.blockedSensitivityClasses.includes(variable.sensitivity) && variable.releaseHandling !== "excluded" && !variable.deidentified) {
    findings.push(finding("SENSITIVE_VARIABLE_RELEASED", "blocker", "Sensitive or identifying variable is marked for release without exclusion or de-identification.", {
      variable: variable.name,
      sensitivity: variable.sensitivity,
    }))
  }

  return findings
}

function buildReviewerActions(status, findings) {
  if (status === "pass") {
    return [{ code: "APPROVE_DATA_DICTIONARY_RELEASE", owner: "data-steward", message: "Approve dataset release with the current dictionary and metadata packet." }]
  }

  const actions = findings.map((item) => {
    if (item.code === "UNDOCUMENTED_COLUMNS") {
      return { code: "DOCUMENT_ALL_RELEASE_COLUMNS", owner: "data-steward", message: "Add dictionary entries for every released column before DOI/export." }
    }
    if (item.code === "MEASUREMENT_UNIT_MISSING" || item.code === "MEASUREMENT_UNIT_NOT_STANDARD") {
      return { code: "FIX_MEASUREMENT_UNITS", owner: "domain-reviewer", message: "Add standard units and unit authority for measurement variables." }
    }
    if (item.code === "SENSITIVE_VARIABLE_RELEASED") {
      return { code: "REMOVE_OR_DEIDENTIFY_SENSITIVE_FIELDS", owner: "privacy-reviewer", message: "Exclude or de-identify sensitive variables before public release." }
    }
    if (item.code === "LICENSE_NOT_RELEASE_READY") {
      return { code: "RESOLVE_LICENSE_BEFORE_RELEASE", owner: "project-admin", message: "Select an approved release license before publishing." }
    }
    if (item.code === "FILE_CHECKSUM_MISSING") {
      return { code: "ADD_FILE_CHECKSUMS", owner: "release-engineer", message: "Add stable checksums for every release artifact." }
    }
    return { code: `ADDRESS_${item.code}`, owner: "data-steward", message: item.message }
  })

  return [...new Map(actions.map((item) => [item.code, item])).values()]
}

function evaluateDatasetRelease(dataset, policy) {
  const findings = [
    ...evaluateMetadata(dataset, policy),
    ...evaluateColumnCoverage(dataset),
    ...dataset.dictionary.flatMap((variable) => evaluateVariable(variable, policy)),
  ]
  const blockers = findings.filter((item) => item.severity === "blocker")
  const warnings = findings.filter((item) => item.severity === "warning")
  const status = blockers.length > 0 ? "hold" : (warnings.length > 0 ? "revise" : "pass")

  const decision = {
    id: dataset.id,
    title: dataset.metadata.title,
    status,
    releaseTarget: dataset.releaseTarget,
    manifest: {
      files: dataset.files.length,
      columns: unique(dataset.files.flatMap((file) => file.columns)).length,
      dictionaryEntries: dataset.dictionary.length,
      license: dataset.metadata.license,
      accessPolicy: dataset.metadata.accessPolicy,
      persistentIdentifier: dataset.metadata.persistentIdentifier || "pending",
    },
    findings,
    reviewerActions: buildReviewerActions(status, findings),
  }

  return {
    ...decision,
    auditDigest: digestFor(decision),
  }
}

function evaluateReleasePortfolio({ datasets, policy }) {
  const decisions = datasets.map((dataset) => evaluateDatasetRelease(dataset, policy))
  const summary = {
    totalDatasets: decisions.length,
    passed: decisions.filter((decision) => decision.status === "pass").length,
    revise: decisions.filter((decision) => decision.status === "revise").length,
    held: decisions.filter((decision) => decision.status === "hold").length,
    blockers: decisions.reduce((sum, decision) => sum + decision.findings.filter((item) => item.severity === "blocker").length, 0),
    warnings: decisions.reduce((sum, decision) => sum + decision.findings.filter((item) => item.severity === "warning").length, 0),
  }

  return {
    generatedAt: "2026-05-21T18:05:00.000Z",
    policy,
    summary,
    decisions,
    audit: {
      source: "synthetic-data-dictionary-release-gate",
      digest: digestFor({ summary, decisions }),
    },
  }
}

module.exports = {
  digestFor,
  evaluateDatasetRelease,
  evaluateReleasePortfolio,
}
