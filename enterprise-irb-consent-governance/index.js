const crypto = require("crypto")

const BLOCKING_SEVERITIES = new Set(["critical", "high"])

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex")
}

function hmacSha256(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex")
}

function daysBetween(start, end) {
  const ms = Date.parse(end) - Date.parse(start)
  return Math.floor(ms / 86400000)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function containsAny(values, candidates) {
  return values.some((value) => candidates.includes(value))
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({
    severity,
    code,
    message,
    evidence,
  })
}

function evaluateConsentPurposeCoverage(project, findings) {
  for (const dataset of project.datasets) {
    const missingPurposes = dataset.purposes.filter(
      (purpose) => !project.consent.scopes.includes(purpose),
    )

    if (missingPurposes.length > 0) {
      addFinding(
        findings,
        "high",
        "CONSENT_SCOPE_GAP",
        `${dataset.id} uses purposes that are not covered by participant consent.`,
        { dataset: dataset.id, missingPurposes },
      )
    }
  }
}

function evaluateHumanSubjects(project, policy, asOf, findings) {
  if (!project.humanSubjects) return

  if (!project.irb || project.irb.status !== "approved") {
    addFinding(findings, "critical", "IRB_NOT_APPROVED", "Human-subjects project is missing active IRB approval.", {
      irb: project.irb || null,
    })
  }

  if (project.irb?.expiresAt && daysBetween(asOf, project.irb.expiresAt) < 0) {
    addFinding(findings, "critical", "IRB_EXPIRED", "IRB approval has expired.", {
      expiresAt: project.irb.expiresAt,
    })
  }

  if (project.irb?.expiresAt && daysBetween(asOf, project.irb.expiresAt) <= policy.warningWindows.irbExpiryDays) {
    addFinding(findings, "medium", "IRB_EXPIRY_SOON", "IRB approval is close to expiry.", {
      expiresAt: project.irb.expiresAt,
      warningDays: policy.warningWindows.irbExpiryDays,
    })
  }

  if (project.participants.minors && !project.consent.guardianConsent) {
    addFinding(findings, "critical", "MINOR_GUARDIAN_CONSENT_MISSING", "Minor participants require guardian consent.", {
      minors: project.participants.minors,
    })
  }

  evaluateConsentPurposeCoverage(project, findings)
}

function evaluateDataUse(project, policy, findings) {
  const allClasses = unique(project.datasets.flatMap((dataset) => dataset.dataClasses))
  const controlledClasses = allClasses.filter((dataClass) => policy.controlledDataClasses.includes(dataClass))

  if (controlledClasses.length > 0 && !project.dataUseAgreement.active) {
    addFinding(findings, "high", "DUA_MISSING", "Controlled data classes require an active data-use agreement.", {
      controlledClasses,
    })
  }

  for (const dataset of project.datasets) {
    if (containsAny(dataset.dataClasses, policy.deidentificationRequiredFor) && !dataset.deidentified) {
      addFinding(findings, "high", "DEIDENTIFICATION_REQUIRED", `${dataset.id} must be de-identified before export.`, {
        dataset: dataset.id,
        dataClasses: dataset.dataClasses,
      })
    }
  }
}

function evaluateExports(project, policy, findings) {
  for (const target of project.exportTargets) {
    if (!policy.allowedExportTargets.includes(target.type)) {
      addFinding(findings, "high", "EXPORT_TARGET_NOT_ALLOWED", `${target.type} is not an allowed enterprise target.`, {
        target,
      })
    }

    if (!policy.allowedJurisdictions.includes(target.jurisdiction)) {
      addFinding(findings, "high", "EXPORT_JURISDICTION_BLOCKED", `${target.jurisdiction} is outside allowed jurisdictions.`, {
        target,
      })
    }

    if (target.requiresAnonymizedData) {
      const rawDatasets = project.datasets.filter((dataset) => !dataset.deidentified)
      if (rawDatasets.length > 0) {
        addFinding(findings, "high", "RAW_DATA_EXPORT_BLOCKED", "Target requires anonymized data but project has raw datasets.", {
          target: target.name,
          rawDatasets: rawDatasets.map((dataset) => dataset.id),
        })
      }
    }
  }
}

function evaluateRetention(project, policy, asOf, findings) {
  for (const dataset of project.datasets) {
    const ageDays = daysBetween(dataset.collectedAt, asOf)
    const retentionLimit = policy.retentionDaysByClass[dataset.dataClasses[0]] || policy.defaultRetentionDays

    if (ageDays > retentionLimit) {
      addFinding(findings, "medium", "RETENTION_REVIEW_REQUIRED", `${dataset.id} exceeded its retention review window.`, {
        dataset: dataset.id,
        ageDays,
        retentionLimit,
      })
    }
  }
}

function buildActionQueue(project, findings) {
  return findings.map((finding) => {
    const owner =
      finding.code === "IRB_NOT_APPROVED" || finding.code === "IRB_EXPIRED"
        ? project.owners.irbAdmin
        : finding.code.includes("CONSENT")
          ? project.owners.consentOfficer
          : project.owners.dataSteward

    return {
      owner,
      code: finding.code,
      severity: finding.severity,
      dueInDays: finding.severity === "critical" ? 1 : finding.severity === "high" ? 3 : 14,
      summary: finding.message,
    }
  })
}

function evaluateProject(project, policy, options = {}) {
  const asOf = options.asOf || policy.asOf
  const findings = []

  evaluateHumanSubjects(project, policy, asOf, findings)
  evaluateDataUse(project, policy, findings)
  evaluateExports(project, policy, findings)
  evaluateRetention(project, policy, asOf, findings)

  const blockingFindings = findings.filter((finding) => BLOCKING_SEVERITIES.has(finding.severity))
  const status = blockingFindings.length > 0 ? "blocked" : findings.length > 0 ? "review" : "approved"
  const riskScore = findings.reduce((score, finding) => {
    const weights = { critical: 40, high: 25, medium: 10, low: 3 }
    return score + weights[finding.severity]
  }, 0)

  const event = {
    type: "enterprise.irb_consent_governance.evaluated",
    projectId: project.id,
    status,
    findingCount: findings.length,
    blockingCount: blockingFindings.length,
    generatedAt: asOf,
  }

  const canonicalEvent = stableStringify(event)

  return {
    projectId: project.id,
    title: project.title,
    status,
    riskScore,
    findings,
    actionQueue: buildActionQueue(project, findings),
    exportDecision: status === "approved" ? "allow" : status === "review" ? "hold-for-review" : "block",
    evidenceDigest: sha256(stableStringify({ project, findings })),
    webhookEvent: {
      ...event,
      signature: `sha256=${hmacSha256(policy.webhookSecret, canonicalEvent)}`,
    },
  }
}

function summarizeEvaluations(evaluations) {
  const counts = evaluations.reduce(
    (acc, evaluation) => {
      acc[evaluation.status] += 1
      return acc
    },
    { approved: 0, review: 0, blocked: 0 },
  )

  return {
    projectCount: evaluations.length,
    ...counts,
    topRisks: evaluations
      .slice()
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 3)
      .map((evaluation) => ({
        projectId: evaluation.projectId,
        title: evaluation.title,
        status: evaluation.status,
        riskScore: evaluation.riskScore,
      })),
  }
}

function generateGovernancePacket(projects, policy, options = {}) {
  const evaluations = projects.map((project) => evaluateProject(project, policy, options))

  return {
    generatedAt: options.asOf || policy.asOf,
    module: "enterprise-irb-consent-governance",
    summary: summarizeEvaluations(evaluations),
    evaluations,
    auditDigest: sha256(stableStringify(evaluations)),
  }
}

module.exports = {
  evaluateProject,
  generateGovernancePacket,
  stableStringify,
  sha256,
  hmacSha256,
}
