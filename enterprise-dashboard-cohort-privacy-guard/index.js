const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  minCohortSize: 7,
  minNamedContributorCount: 5,
  minLabsForCrossLabMetric: 3,
  minDepartmentsForInstitutionRollup: 2,
  maxRecentWindowHoursForSmallCohort: 24,
  restrictedExportTargets: ["csv", "webhook", "external_bi"],
  privateVisibilityValues: ["private", "invitation-only", "institutional-only"],
})

function evaluateDashboardPrivacy(input) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const dashboards = Array.isArray(input.dashboards) ? input.dashboards : []
  const organization = input.organization || { id: "unknown", name: "Unknown organization" }

  const dashboardDecisions = dashboards.map((dashboard) => evaluateDashboard(dashboard, policy))
  const adminActions = collectAdminActions(dashboardDecisions)
  const exportManifest = buildExportManifest(dashboardDecisions, policy)
  const summary = summarize(dashboardDecisions, adminActions, exportManifest)
  const auditPayload = {
    asOf,
    organization,
    summary,
    dashboards: dashboardDecisions.map((dashboard) => ({
      id: dashboard.id,
      status: dashboard.status,
      reviewedRows: dashboard.reviewedRows,
      suppressedRows: dashboard.suppressedRows,
      maskedRows: dashboard.maskedRows,
      findings: dashboard.findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        rowId: finding.rowId,
      })),
    })),
    exportManifest,
  }

  return {
    asOf,
    organization,
    summary,
    dashboards: dashboardDecisions,
    adminActions,
    exportManifest,
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      reviewedAt: asOf,
      policyVersion: policy.version || "dashboard-cohort-privacy-v1",
    },
  }
}

function evaluateDashboard(dashboard, policy) {
  const rows = Array.isArray(dashboard.rows) ? dashboard.rows : []
  const rowDecisions = rows.map((row) => evaluateRow(dashboard, row, policy))
  const findings = rowDecisions.flatMap((rowDecision) => rowDecision.findings)
  const suppressedRows = rowDecisions.filter((row) => row.action === "suppress").length
  const maskedRows = rowDecisions.filter((row) => row.action === "mask" || row.action === "roll_up").length
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length
  const warningFindings = findings.filter((finding) => finding.severity === "warning").length
  const exportBlocked = rowDecisions.some((row) => row.exportDecision === "block_raw_export")

  let status = "ready"
  if (criticalFindings > 0 || exportBlocked) {
    status = "hold_for_privacy_review"
  } else if (maskedRows > 0 || warningFindings > 0) {
    status = "masked_ready"
  }

  return {
    id: dashboard.id,
    title: dashboard.title,
    metricKind: dashboard.metricKind,
    audience: dashboard.audience,
    exportTargets: dashboard.exportTargets || [],
    status,
    reviewedRows: rowDecisions.length,
    suppressedRows,
    maskedRows,
    findings,
    rowDecisions,
    reviewerNotes: buildReviewerNotes(dashboard, rowDecisions, policy),
  }
}

function evaluateRow(dashboard, row, policy) {
  const findings = []
  const cohortSize = numberOrZero(row.cohortSize)
  const contributorCount = numberOrZero(row.contributorCount)
  const labCount = numberOrZero(row.labCount)
  const departmentCount = numberOrZero(row.departmentCount)
  const recentWindowHours = numberOrZero(row.recentWindowHours)
  const visibility = String(row.projectVisibility || "public")
  const privateProject = policy.privateVisibilityValues.includes(visibility)
  const rowId = row.id || `${dashboard.id}:${row.label || "row"}`

  if (cohortSize > 0 && cohortSize < policy.minCohortSize) {
    findings.push(finding({
      code: "small_cohort",
      severity: "critical",
      rowId,
      message: `Cohort size ${cohortSize} is below the minimum ${policy.minCohortSize}.`,
      remediation: "Suppress this row or roll it into a larger department-level aggregate.",
    }))
  }

  if (dashboard.metricKind === "named_contributor_heatmap" && contributorCount < policy.minNamedContributorCount) {
    findings.push(finding({
      code: "named_contributor_reidentification",
      severity: "critical",
      rowId,
      message: `Named contributor count ${contributorCount} is below the minimum ${policy.minNamedContributorCount}.`,
      remediation: "Replace named cells with anonymous activity buckets before dashboard release.",
    }))
  }

  if (dashboard.metricKind === "cross_lab_collaboration" && labCount < policy.minLabsForCrossLabMetric) {
    findings.push(finding({
      code: "cross_lab_rollup_needed",
      severity: "warning",
      rowId,
      message: `Only ${labCount} lab(s) contribute to this collaboration metric.`,
      remediation: "Roll the row up to a broader initiative or institution-level collaboration metric.",
    }))
  }

  if (dashboard.metricKind === "institution_rollup" && departmentCount > 0 && departmentCount < policy.minDepartmentsForInstitutionRollup) {
    findings.push(finding({
      code: "department_rollup_too_narrow",
      severity: "warning",
      rowId,
      message: `Only ${departmentCount} department(s) appear in an institution-wide rollup.`,
      remediation: "Aggregate with another department or hide the department label.",
    }))
  }

  if (privateProject) {
    findings.push(finding({
      code: "private_project_mask_required",
      severity: "warning",
      rowId,
      message: `Visibility ${visibility} requires project and lab labels to be masked.`,
      remediation: "Replace project names with privacy-safe aliases and omit direct project links.",
    }))
  }

  if (row.containsDirectIdentifiers === true) {
    findings.push(finding({
      code: "direct_identifier_block",
      severity: "critical",
      rowId,
      message: "The dashboard row includes direct identifiers.",
      remediation: "Remove names, emails, handles, employee IDs, and direct project URLs before export.",
    }))
  }

  if (recentWindowHours > 0 && recentWindowHours <= policy.maxRecentWindowHoursForSmallCohort && cohortSize < policy.minCohortSize * 2) {
    findings.push(finding({
      code: "recent_activity_window",
      severity: "warning",
      rowId,
      message: `Recent ${recentWindowHours}h activity can reveal individual behavior in this cohort.`,
      remediation: "Use a weekly or monthly window for small groups.",
    }))
  }

  if (Array.isArray(row.sensitiveTags) && row.sensitiveTags.length > 0) {
    findings.push(finding({
      code: "sensitive_tag_exposure",
      severity: "warning",
      rowId,
      message: `Sensitive tags present: ${row.sensitiveTags.join(", ")}.`,
      remediation: "Display only approved initiative aliases in institutional dashboards.",
    }))
  }

  const critical = findings.some((item) => item.severity === "critical")
  const warning = findings.some((item) => item.severity === "warning")
  let action = "publish"
  if (critical) {
    action = "suppress"
  } else if (findings.some((item) => item.code.includes("rollup") || item.code.includes("roll_up"))) {
    action = "roll_up"
  } else if (warning) {
    action = "mask"
  }

  const exportDecision = critical && intersects(dashboard.exportTargets, policy.restrictedExportTargets)
    ? "block_raw_export"
    : "allow_sanitized_export"

  return {
    rowId,
    label: row.label,
    cohortSize,
    contributorCount,
    labCount,
    departmentCount,
    projectVisibility: visibility,
    action,
    exportDecision,
    publicLabel: buildPublicLabel(row, action),
    publicValue: action === "suppress" ? null : row.value,
    findings,
  }
}

function buildPublicLabel(row, action) {
  if (action === "suppress") {
    return "Suppressed small cohort"
  }

  if (action === "roll_up") {
    return row.rollupLabel || "Institution aggregate"
  }

  if (action === "mask") {
    return row.maskedLabel || "Masked cohort"
  }

  return row.label || "Published cohort"
}

function buildReviewerNotes(dashboard, rowDecisions, policy) {
  const notes = []
  const suppressed = rowDecisions.filter((row) => row.action === "suppress")
  const masked = rowDecisions.filter((row) => row.action === "mask")
  const rollups = rowDecisions.filter((row) => row.action === "roll_up")

  if (suppressed.length > 0) {
    notes.push(`${suppressed.length} row(s) are held because they fall below k=${policy.minCohortSize} or expose direct identifiers.`)
  }

  if (masked.length > 0) {
    notes.push(`${masked.length} row(s) can be shown after project/lab labels and sensitive tags are masked.`)
  }

  if (rollups.length > 0) {
    notes.push(`${rollups.length} row(s) need broader aggregation before dashboard release.`)
  }

  if (notes.length === 0) {
    notes.push(`${dashboard.title} is ready for institutional dashboard release.`)
  }

  return notes
}

function collectAdminActions(dashboards) {
  return dashboards.flatMap((dashboard) => {
    return dashboard.rowDecisions
      .filter((row) => row.action !== "publish" || row.exportDecision !== "allow_sanitized_export")
      .map((row) => ({
        dashboardId: dashboard.id,
        rowId: row.rowId,
        action: actionToAdminTask(row.action, row.exportDecision),
        severity: row.findings.some((finding) => finding.severity === "critical") ? "critical" : "warning",
        reasons: row.findings.map((finding) => finding.code),
      }))
  })
}

function buildExportManifest(dashboards, policy) {
  return dashboards.map((dashboard) => {
    const blockedRows = dashboard.rowDecisions
      .filter((row) => row.exportDecision === "block_raw_export")
      .map((row) => row.rowId)

    const allowedTargets = (dashboard.exportTargets || [])
      .filter((target) => blockedRows.length === 0 || !policy.restrictedExportTargets.includes(target))

    return {
      dashboardId: dashboard.id,
      status: blockedRows.length > 0 ? "raw_export_blocked" : "sanitized_export_ready",
      allowedTargets,
      blockedRows,
      sanitizedRows: dashboard.rowDecisions
        .filter((row) => row.action !== "suppress")
        .map((row) => ({
          rowId: row.rowId,
          label: row.publicLabel,
          value: row.publicValue,
          action: row.action,
        })),
    }
  })
}

function summarize(dashboards, adminActions, exportManifest) {
  const totals = dashboards.reduce((summary, dashboard) => {
    summary.totalWidgets += 1
    summary.totalRows += dashboard.reviewedRows
    summary.suppressedRows += dashboard.suppressedRows
    summary.maskedRows += dashboard.maskedRows
    summary.criticalFindings += dashboard.findings.filter((finding) => finding.severity === "critical").length
    summary.warningFindings += dashboard.findings.filter((finding) => finding.severity === "warning").length
    summary[dashboard.status] = (summary[dashboard.status] || 0) + 1
    return summary
  }, {
    totalWidgets: 0,
    totalRows: 0,
    suppressedRows: 0,
    maskedRows: 0,
    criticalFindings: 0,
    warningFindings: 0,
    ready: 0,
    masked_ready: 0,
    hold_for_privacy_review: 0,
  })

  return {
    ...totals,
    adminActionCount: adminActions.length,
    blockedRawExports: exportManifest.filter((item) => item.status === "raw_export_blocked").length,
  }
}

function actionToAdminTask(action, exportDecision) {
  if (exportDecision === "block_raw_export") {
    return "block_raw_export_and_rebuild_aggregate"
  }

  if (action === "roll_up") {
    return "roll_up_before_release"
  }

  if (action === "mask") {
    return "mask_labels_before_release"
  }

  return "review_before_release"
}

function finding({ code, severity, rowId, message, remediation }) {
  return { code, severity, rowId, message, remediation }
}

function intersects(left = [], right = []) {
  return left.some((item) => right.includes(item))
}

function numberOrZero(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`
  }

  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateDashboardPrivacy,
  stableStringify,
}
