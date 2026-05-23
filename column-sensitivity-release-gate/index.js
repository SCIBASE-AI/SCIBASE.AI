const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  publicReleaseModes: ["public_preview", "api_access", "export_bundle"],
  directIdentifierTypes: ["person_name", "email", "phone", "street_address", "subject_id"],
  quasiIdentifierTypes: ["age", "date", "postal_code", "institution", "rare_condition"],
  sensitiveTypes: ["diagnosis", "genetic_marker", "lab_result", "income", "free_text", "precise_location"],
  acceptedTransforms: ["drop", "hash", "generalize", "bucket", "redact", "coarsen_location"],
  minKAnonymity: 10,
  maxPreciseLocationDecimals: 2,
  maxSensitiveColumnsPublic: 3,
  policyVersion: "column-sensitivity-release-v1",
})

function evaluateColumnSensitivityRelease(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const datasets = Array.isArray(input.datasets) ? input.datasets : []
  const datasetDecisions = datasets.map((dataset) => evaluateDataset(dataset, policy))
  const reviewQueue = datasetDecisions.flatMap((dataset) => dataset.reviewQueue)
  const summary = summarize(datasetDecisions, reviewQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    datasets: datasetDecisions.map((dataset) => ({
      datasetId: dataset.datasetId,
      status: dataset.status,
      findingCodes: dataset.findings.map((finding) => finding.code),
    })),
  }

  return {
    asOf,
    policy,
    summary,
    datasets: datasetDecisions,
    reviewQueue,
    releaseQueue: datasetDecisions
      .filter((dataset) => dataset.status === "release_ready")
      .map((dataset) => ({
        datasetId: dataset.datasetId,
        action: "enable_preview_api_or_export",
        checkedColumns: dataset.summary.columns,
      })),
    holdQueue: datasetDecisions
      .filter((dataset) => dataset.status !== "release_ready")
      .map((dataset) => ({
        datasetId: dataset.datasetId,
        action: dataset.status === "release_blocked" ? "block_release_until_sensitivity_fixed" : "defer_release_for_review",
        findingCodes: dataset.findings.map((finding) => finding.code),
      })),
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.policyVersion,
    },
  }
}

function evaluateDataset(dataset, policy) {
  const columns = Array.isArray(dataset.columns) ? dataset.columns : []
  const approvals = Array.isArray(dataset.stewardApprovals) ? dataset.stewardApprovals : []
  const releaseModes = Array.isArray(dataset.releaseModes) ? dataset.releaseModes : []
  const findings = []
  const checks = []
  const publicModes = releaseModes.filter((mode) => policy.publicReleaseModes.includes(mode))
  const sensitiveColumns = columns.filter((column) => sensitivityCategory(column, policy) !== "low")
  const directIdentifierFindings = findDirectIdentifierFindings(columns, policy)
  const quasiIdentifierFindings = findQuasiIdentifierFindings(columns, dataset, policy)
  const freeTextFindings = findFreeTextFindings(columns)
  const locationFindings = findLocationPrecisionFindings(columns, policy)
  const missingApprovals = findMissingApprovals(sensitiveColumns, approvals, publicModes)
  const publicSensitiveOverage = publicModes.length > 0 && sensitiveColumns.length > policy.maxSensitiveColumnsPublic

  addCheck(checks, findings, {
    datasetId: dataset.datasetId,
    code: "direct_identifiers_transformed",
    severity: "critical",
    pass: directIdentifierFindings.length === 0,
    message: directIdentifierFindings.length === 0
      ? "Direct identifier columns are removed or transformed before release."
      : `${directIdentifierFindings.length} direct identifier columns lack an accepted release transform.`,
    remediation: "Drop, hash, or redact direct identifiers before public preview, API access, or export.",
    evidence: { columns: directIdentifierFindings },
  })

  addCheck(checks, findings, {
    datasetId: dataset.datasetId,
    code: "quasi_identifier_k_anonymity_met",
    severity: "critical",
    pass: quasiIdentifierFindings.length === 0,
    message: quasiIdentifierFindings.length === 0
      ? "Quasi-identifier release evidence satisfies k-anonymity policy."
      : `${quasiIdentifierFindings.length} quasi-identifier columns do not satisfy k-anonymity policy.`,
    remediation: "Generalize, bucket, or suppress quasi-identifiers until release evidence meets the k-anonymity threshold.",
    evidence: { columns: quasiIdentifierFindings, minKAnonymity: policy.minKAnonymity },
  })

  addCheck(checks, findings, {
    datasetId: dataset.datasetId,
    code: "free_text_review_attested",
    severity: "warning",
    pass: freeTextFindings.length === 0,
    message: freeTextFindings.length === 0
      ? "Free-text columns have redaction review evidence."
      : `${freeTextFindings.length} free-text columns are missing redaction review evidence.`,
    remediation: "Attach redaction review evidence or remove free-text columns from release lanes.",
    evidence: { columns: freeTextFindings },
  })

  addCheck(checks, findings, {
    datasetId: dataset.datasetId,
    code: "location_precision_safe",
    severity: "critical",
    pass: locationFindings.length === 0,
    message: locationFindings.length === 0
      ? "Location columns are coarsened to the allowed precision."
      : `${locationFindings.length} location columns retain excessive precision.`,
    remediation: "Coarsen location coordinates or suppress precise locations before release.",
    evidence: { columns: locationFindings, maxPreciseLocationDecimals: policy.maxPreciseLocationDecimals },
  })

  addCheck(checks, findings, {
    datasetId: dataset.datasetId,
    code: "data_steward_approval_present",
    severity: "critical",
    pass: missingApprovals.length === 0,
    message: missingApprovals.length === 0
      ? "Data-steward approvals cover sensitive released columns."
      : `${missingApprovals.length} sensitive columns are missing release approval.`,
    remediation: "Collect data-steward approval for each sensitive column before enabling release lanes.",
    evidence: { missingApprovals },
  })

  addCheck(checks, findings, {
    datasetId: dataset.datasetId,
    code: "public_sensitive_column_budget",
    severity: "warning",
    pass: !publicSensitiveOverage,
    message: !publicSensitiveOverage
      ? "Public release stays within the sensitive-column review budget."
      : "Public release contains more sensitive columns than policy allows without extra review.",
    remediation: "Reduce public columns, split the dataset, or route to restricted access review.",
    evidence: {
      sensitiveColumns: sensitiveColumns.map((column) => column.columnId),
      maxSensitiveColumnsPublic: policy.maxSensitiveColumnsPublic,
      releaseModes: publicModes,
    },
  })

  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")
  const status = criticalFindings.length > 0
    ? "release_blocked"
    : warningFindings.length > 0
      ? "release_review"
      : "release_ready"

  return {
    datasetId: dataset.datasetId,
    title: dataset.title,
    status,
    summary: {
      columns: columns.length,
      sensitiveColumns: sensitiveColumns.length,
      releaseModes: publicModes.length,
      criticalFindings: criticalFindings.length,
      warningFindings: warningFindings.length,
    },
    checks,
    findings,
    columnSummary: columns.map((column) => ({
      columnId: column.columnId,
      label: column.label,
      sensitivity: sensitivityCategory(column, policy),
      transform: column.transform || null,
    })),
    reviewQueue: findings.map((finding) => ({
      datasetId: dataset.datasetId,
      code: finding.code,
      severity: finding.severity,
      action: findingAction(finding.code),
      remediation: finding.remediation,
    })),
  }
}

function findDirectIdentifierFindings(columns, policy) {
  return columns
    .filter((column) => policy.directIdentifierTypes.includes(column.sensitivityType))
    .filter((column) => !policy.acceptedTransforms.includes(column.transform))
    .map((column) => ({ columnId: column.columnId, sensitivityType: column.sensitivityType, transform: column.transform || null }))
}

function findQuasiIdentifierFindings(columns, dataset, policy) {
  const releaseEvidence = dataset.releaseEvidence || {}
  const kAnonymity = Number.isFinite(releaseEvidence.kAnonymity) ? releaseEvidence.kAnonymity : null

  return columns
    .filter((column) => policy.quasiIdentifierTypes.includes(column.sensitivityType))
    .filter((column) => !policy.acceptedTransforms.includes(column.transform) || kAnonymity === null || kAnonymity < policy.minKAnonymity)
    .map((column) => ({
      columnId: column.columnId,
      sensitivityType: column.sensitivityType,
      transform: column.transform || null,
      kAnonymity,
    }))
}

function findFreeTextFindings(columns) {
  return columns
    .filter((column) => column.sensitivityType === "free_text")
    .filter((column) => !(column.redactionReview && column.redactionReview.status === "passed"))
    .map((column) => ({ columnId: column.columnId, reviewStatus: column.redactionReview ? column.redactionReview.status : null }))
}

function findLocationPrecisionFindings(columns, policy) {
  return columns
    .filter((column) => column.sensitivityType === "precise_location")
    .filter((column) => column.transform !== "coarsen_location" || Number(column.precisionDecimals) > policy.maxPreciseLocationDecimals)
    .map((column) => ({
      columnId: column.columnId,
      transform: column.transform || null,
      precisionDecimals: Number.isFinite(Number(column.precisionDecimals)) ? Number(column.precisionDecimals) : null,
    }))
}

function findMissingApprovals(sensitiveColumns, approvals, publicModes) {
  if (publicModes.length === 0) {
    return []
  }

  const approvedColumnIds = new Set(approvals
    .filter((approval) => approval.status === "approved" && approval.role === "data_steward")
    .map((approval) => approval.columnId))

  return sensitiveColumns
    .filter((column) => !approvedColumnIds.has(column.columnId))
    .map((column) => ({ columnId: column.columnId, sensitivityType: column.sensitivityType }))
}

function sensitivityCategory(column, policy) {
  if (policy.directIdentifierTypes.includes(column.sensitivityType)) {
    return "direct_identifier"
  }

  if (policy.quasiIdentifierTypes.includes(column.sensitivityType)) {
    return "quasi_identifier"
  }

  if (policy.sensitiveTypes.includes(column.sensitivityType)) {
    return "sensitive"
  }

  return "low"
}

function addCheck(checks, findings, check) {
  checks.push({
    code: check.code,
    severity: check.severity,
    pass: check.pass,
    message: check.message,
    evidence: check.evidence || {},
  })

  if (!check.pass) {
    findings.push({
      datasetId: check.datasetId,
      code: check.code,
      severity: check.severity,
      message: check.message,
      remediation: check.remediation,
      evidence: check.evidence || {},
    })
  }
}

function summarize(datasetDecisions, reviewQueue) {
  return {
    totalDatasets: datasetDecisions.length,
    readyDatasets: datasetDecisions.filter((dataset) => dataset.status === "release_ready").length,
    reviewDatasets: datasetDecisions.filter((dataset) => dataset.status === "release_review").length,
    blockedDatasets: datasetDecisions.filter((dataset) => dataset.status === "release_blocked").length,
    totalColumns: datasetDecisions.reduce((total, dataset) => total + dataset.summary.columns, 0),
    sensitiveColumns: datasetDecisions.reduce((total, dataset) => total + dataset.summary.sensitiveColumns, 0),
    totalFindings: reviewQueue.length,
    criticalFindings: reviewQueue.filter((item) => item.severity === "critical").length,
    warningFindings: reviewQueue.filter((item) => item.severity === "warning").length,
  }
}

function findingAction(code) {
  const actions = {
    direct_identifiers_transformed: "transform_or_remove_direct_identifiers",
    quasi_identifier_k_anonymity_met: "generalize_quasi_identifiers",
    free_text_review_attested: "complete_free_text_redaction_review",
    location_precision_safe: "coarsen_location_precision",
    data_steward_approval_present: "collect_column_release_approval",
    public_sensitive_column_budget: "route_to_restricted_access_review",
  }

  return actions[code] || "column_sensitivity_followup"
}

function digest(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateColumnSensitivityRelease,
}
