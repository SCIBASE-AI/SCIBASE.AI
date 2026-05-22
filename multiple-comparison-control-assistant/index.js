const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  pValueThreshold: 0.05,
  fdrThreshold: 0.05,
  familySizeWarningThreshold: 5,
  allowedCorrectionMethods: [
    "benjamini-hochberg",
    "bonferroni",
    "holm",
    "pre-registered-hierarchy",
  ],
  policyVersion: "multiple-comparison-control-v1",
})

function evaluateMultipleComparisonControls(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const manuscripts = Array.isArray(input.manuscripts) ? input.manuscripts : []
  const manuscriptDecisions = manuscripts.map((manuscript) => evaluateManuscript(manuscript, policy))
  const reviewQueue = manuscriptDecisions.flatMap((manuscript) => manuscript.reviewQueue)
  const summary = summarize(manuscriptDecisions, reviewQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    manuscripts: manuscriptDecisions.map((manuscript) => ({
      manuscriptId: manuscript.manuscriptId,
      status: manuscript.status,
      findingCodes: manuscript.findings.map((finding) => finding.code),
    })),
  }

  return {
    asOf,
    policy,
    summary,
    manuscripts: manuscriptDecisions,
    reviewQueue,
    readyQueue: manuscriptDecisions
      .filter((manuscript) => manuscript.status === "peer_review_ready")
      .map((manuscript) => ({
        manuscriptId: manuscript.manuscriptId,
        action: "allow_peer_review_submission",
        checkedFamilies: manuscript.summary.families,
      })),
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.policyVersion,
    },
  }
}

function evaluateManuscript(manuscript, policy) {
  const families = Array.isArray(manuscript.analysisFamilies) ? manuscript.analysisFamilies : []
  const statements = Array.isArray(manuscript.resultStatements) ? manuscript.resultStatements : []
  const familyDecisions = families.map((family) => evaluateFamily(family, statements, policy))
  const findings = familyDecisions.flatMap((family) => family.findings)
  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")
  const status = criticalFindings.length > 0
    ? "revise_before_submission"
    : warningFindings.length > 0
      ? "statistical_review"
      : "peer_review_ready"

  return {
    manuscriptId: manuscript.manuscriptId,
    title: manuscript.title,
    status,
    summary: {
      families: familyDecisions.length,
      tests: familyDecisions.reduce((total, family) => total + family.testsReviewed, 0),
      passedFamilies: familyDecisions.filter((family) => family.status === "passed").length,
      criticalFindings: criticalFindings.length,
      warningFindings: warningFindings.length,
    },
    families: familyDecisions,
    findings,
    reviewQueue: findings.map((finding) => ({
      manuscriptId: manuscript.manuscriptId,
      familyId: finding.familyId,
      code: finding.code,
      severity: finding.severity,
      action: reviewAction(finding.code),
      remediation: finding.remediation,
    })),
  }
}

function evaluateFamily(family, statements, policy) {
  const tests = Array.isArray(family.tests) ? family.tests : []
  const familyStatements = statements.filter((statement) => statement.familyId === family.familyId)
  const findings = []
  const checks = []
  const declaredFamilySize = Number.isFinite(family.declaredFamilySize) ? family.declaredFamilySize : null
  const familySize = declaredFamilySize || tests.length
  const correctionMethod = normalizeMethod(family.correctionMethod)
  const needsCorrection = familySize > 1 || tests.length > 1
  const confirmatory = family.intent === "confirmatory"
  const exploratory = family.intent === "exploratory"

  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "family_boundary_declared",
    severity: "warning",
    pass: Boolean(declaredFamilySize && declaredFamilySize === tests.length),
    message: declaredFamilySize
      ? `Declared family size ${declaredFamilySize} covers ${tests.length} tests.`
      : "No hypothesis family size is declared.",
    remediation: "Declare the hypothesis family boundary and number of tests used for correction.",
    evidence: { declaredFamilySize, observedTests: tests.length },
  })

  const methodAllowed = policy.allowedCorrectionMethods.includes(correctionMethod)
  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "correction_method_allowed",
    severity: confirmatory ? "critical" : "warning",
    pass: !needsCorrection || methodAllowed,
    message: methodAllowed
      ? `Correction method ${correctionMethod} is accepted.`
      : `Correction method ${correctionMethod || "missing"} is not accepted for this family.`,
    remediation: "Choose a declared multiplicity method such as Benjamini-Hochberg, Bonferroni, Holm, or a pre-registered hierarchy.",
    evidence: { correctionMethod: correctionMethod || null, needsCorrection, intent: family.intent },
  })

  const missingAdjusted = significantTests(tests, policy)
    .filter((test) => needsCorrection && !hasAdjustedEvidence(test, correctionMethod))
  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "adjusted_values_present",
    severity: "critical",
    pass: missingAdjusted.length === 0,
    message: missingAdjusted.length === 0
      ? "Every significant test has adjusted p/q evidence when correction is required."
      : `${missingAdjusted.length} significant tests are missing adjusted p/q evidence.`,
    remediation: "Report adjusted p-values or q-values for every significant claim in the family.",
    evidence: { missingTestIds: missingAdjusted.map((test) => test.testId) },
  })

  const inflatedClaims = findInflatedClaims(familyStatements, tests, policy, correctionMethod)
  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "unadjusted_significance_claim",
    severity: "critical",
    pass: inflatedClaims.length === 0,
    message: inflatedClaims.length === 0
      ? "Result claims align with adjusted evidence."
      : `${inflatedClaims.length} result claims rely on unadjusted or non-significant adjusted evidence.`,
    remediation: "Rewrite significance language or support it with adjusted p/q values below the declared threshold.",
    evidence: { claimIds: inflatedClaims.map((claim) => claim.claimId) },
  })

  const thresholdMismatches = tests
    .filter((test) => adjustedValue(test) !== null)
    .filter((test) => test.claimedSignificant === true && adjustedValue(test) > policy.fdrThreshold)
  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "fdr_threshold_consistency",
    severity: "critical",
    pass: thresholdMismatches.length === 0,
    message: thresholdMismatches.length === 0
      ? "Claimed significant tests are within the adjusted threshold."
      : `${thresholdMismatches.length} tests exceed the adjusted threshold but are still claimed significant.`,
    remediation: "Downgrade the claim or revise the correction threshold and reported adjusted values.",
    evidence: {
      threshold: policy.fdrThreshold,
      testIds: thresholdMismatches.map((test) => test.testId),
    },
  })

  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "endpoint_hierarchy_covered",
    severity: "warning",
    pass: !confirmatory || Boolean(family.endpointHierarchy && family.endpointHierarchy.primaryEndpoints && family.endpointHierarchy.primaryEndpoints.length > 0),
    message: confirmatory
      ? "Confirmatory family endpoint hierarchy reviewed."
      : "Endpoint hierarchy is optional for exploratory families.",
    remediation: "Declare primary and secondary endpoints before making confirmatory significance claims.",
    evidence: {
      intent: family.intent,
      primaryEndpoints: family.endpointHierarchy ? family.endpointHierarchy.primaryEndpoints || [] : [],
    },
  })

  const exploratoryOverclaims = exploratory
    ? familyStatements.filter((statement) => hasConfirmatoryLanguage(statement.text) && !statement.exploratoryLabel)
    : []
  addCheck(checks, findings, {
    familyId: family.familyId,
    code: "exploratory_labeling",
    severity: "warning",
    pass: exploratoryOverclaims.length === 0,
    message: exploratoryOverclaims.length === 0
      ? "Exploratory claims are labeled without confirmatory overstatement."
      : `${exploratoryOverclaims.length} exploratory claims use confirmatory language without a label.`,
    remediation: "Mark exploratory findings clearly and avoid confirmatory language for hypothesis-generating analyses.",
    evidence: { claimIds: exploratoryOverclaims.map((statement) => statement.claimId) },
  })

  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")

  return {
    familyId: family.familyId,
    label: family.label,
    intent: family.intent,
    correctionMethod: correctionMethod || null,
    testsReviewed: tests.length,
    status: criticalFindings.length > 0 ? "failed" : warningFindings.length > 0 ? "needs_statistical_review" : "passed",
    checks,
    findings,
  }
}

function significantTests(tests, policy) {
  return tests.filter((test) => Number.isFinite(test.pValue) && test.pValue <= policy.pValueThreshold)
}

function hasAdjustedEvidence(test, correctionMethod) {
  if (correctionMethod === "pre-registered-hierarchy") {
    return Boolean(test.hierarchyDecision)
  }

  return adjustedValue(test) !== null
}

function adjustedValue(test) {
  if (Number.isFinite(test.adjustedPValue)) {
    return test.adjustedPValue
  }

  if (Number.isFinite(test.qValue)) {
    return test.qValue
  }

  return null
}

function findInflatedClaims(statements, tests, policy, correctionMethod) {
  const testsById = new Map(tests.map((test) => [test.testId, test]))

  return statements.filter((statement) => {
    if (!statement.usesSignificanceLanguage) {
      return false
    }

    const test = testsById.get(statement.testId)
    if (!test) {
      return true
    }

    const adjusted = adjustedValue(test)
    if (correctionMethod === "pre-registered-hierarchy" && test.hierarchyDecision) {
      return false
    }

    if (adjusted === null) {
      return Number.isFinite(test.pValue) && test.pValue <= policy.pValueThreshold
    }

    return adjusted > policy.fdrThreshold
  })
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
      familyId: check.familyId,
      code: check.code,
      severity: check.severity,
      message: check.message,
      remediation: check.remediation,
      evidence: check.evidence || {},
    })
  }
}

function summarize(manuscriptDecisions, reviewQueue) {
  return {
    totalManuscripts: manuscriptDecisions.length,
    readyManuscripts: manuscriptDecisions.filter((manuscript) => manuscript.status === "peer_review_ready").length,
    statisticalReviewManuscripts: manuscriptDecisions.filter((manuscript) => manuscript.status === "statistical_review").length,
    reviseManuscripts: manuscriptDecisions.filter((manuscript) => manuscript.status === "revise_before_submission").length,
    totalFamilies: manuscriptDecisions.reduce((total, manuscript) => total + manuscript.summary.families, 0),
    totalTests: manuscriptDecisions.reduce((total, manuscript) => total + manuscript.summary.tests, 0),
    totalFindings: reviewQueue.length,
    criticalFindings: reviewQueue.filter((item) => item.severity === "critical").length,
    warningFindings: reviewQueue.filter((item) => item.severity === "warning").length,
  }
}

function normalizeMethod(method) {
  return typeof method === "string" ? method.trim().toLowerCase() : ""
}

function hasConfirmatoryLanguage(text) {
  if (typeof text !== "string") {
    return false
  }

  return /\b(confirm|confirmed|primary|definitive|significant effect|proved)\b/i.test(text)
}

function reviewAction(code) {
  const actions = {
    family_boundary_declared: "declare_hypothesis_family",
    correction_method_allowed: "choose_multiplicity_method",
    adjusted_values_present: "report_adjusted_values",
    unadjusted_significance_claim: "rewrite_significance_claim",
    fdr_threshold_consistency: "align_claim_with_adjusted_threshold",
    endpoint_hierarchy_covered: "declare_endpoint_hierarchy",
    exploratory_labeling: "label_exploratory_claims",
  }

  return actions[code] || "statistical_reviewer_followup"
}

function digest(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateMultipleComparisonControls,
}
