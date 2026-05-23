const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  protectedSectionTypes: ["results", "methods", "ethics", "limitations"],
  requiredApprovalRoles: ["corresponding_author"],
  maxNotebookAgeMinutes: 180,
  maxAnchorDrift: 4,
  policyVersion: "collab-suggestion-acceptance-provenance-v1",
})

function evaluateSuggestionAcceptanceProvenance(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const manuscripts = Array.isArray(input.manuscripts) ? input.manuscripts : []
  const decisions = manuscripts.map((manuscript) => evaluateManuscript(manuscript, policy, asOf))
  const reviewQueue = decisions.flatMap((manuscript) => manuscript.reviewQueue)
  const summary = summarize(decisions, reviewQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    manuscripts: decisions.map((manuscript) => ({
      manuscriptId: manuscript.manuscriptId,
      status: manuscript.status,
      suggestionDecisions: manuscript.suggestions.map((suggestion) => ({
        suggestionId: suggestion.suggestionId,
        decision: suggestion.decision,
        findingCodes: suggestion.findings.map((finding) => finding.code),
      })),
    })),
  }

  return {
    asOf,
    policy,
    summary,
    manuscripts: decisions,
    reviewQueue,
    acceptQueue: decisions.flatMap((manuscript) => manuscript.acceptQueue),
    deferQueue: decisions.flatMap((manuscript) => manuscript.deferQueue),
    escalationQueue: decisions.flatMap((manuscript) => manuscript.escalationQueue),
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.policyVersion,
    },
  }
}

function evaluateManuscript(manuscript, policy, asOf) {
  const sections = Array.isArray(manuscript.sections) ? manuscript.sections : []
  const suggestions = Array.isArray(manuscript.suggestions) ? manuscript.suggestions : []
  const comments = Array.isArray(manuscript.comments) ? manuscript.comments : []
  const notebooks = Array.isArray(manuscript.notebookOutputs) ? manuscript.notebookOutputs : []
  const authors = Array.isArray(manuscript.authors) ? manuscript.authors : []
  const sectionsById = new Map(sections.map((section) => [section.sectionId, section]))
  const authorsById = new Map(authors.map((author) => [author.authorId, author]))
  const suggestionDecisions = suggestions.map((suggestion) => evaluateSuggestion({
    suggestion,
    manuscript,
    sectionsById,
    comments,
    notebooks,
    authorsById,
    policy,
    asOf,
  }))
  const acceptQueue = suggestionDecisions
    .filter((suggestion) => suggestion.decision === "accept")
    .map((suggestion) => ({
      manuscriptId: manuscript.manuscriptId,
      suggestionId: suggestion.suggestionId,
      action: "apply_suggestion_with_provenance",
      sectionId: suggestion.sectionId,
      provenanceDigest: suggestion.provenanceDigest,
    }))
  const deferQueue = suggestionDecisions
    .filter((suggestion) => suggestion.decision === "defer")
    .map((suggestion) => ({
      manuscriptId: manuscript.manuscriptId,
      suggestionId: suggestion.suggestionId,
      action: "defer_until_minor_provenance_gap_is_fixed",
      findingCodes: suggestion.findings.map((finding) => finding.code),
    }))
  const escalationQueue = suggestionDecisions
    .filter((suggestion) => suggestion.decision === "escalate")
    .map((suggestion) => ({
      manuscriptId: manuscript.manuscriptId,
      suggestionId: suggestion.suggestionId,
      action: "escalate_before_acceptance_mutates_manuscript",
      findingCodes: suggestion.findings.map((finding) => finding.code),
    }))
  const status = escalationQueue.length > 0
    ? "acceptance_blocked"
    : deferQueue.length > 0
      ? "acceptance_deferred"
      : "acceptance_ready"

  return {
    manuscriptId: manuscript.manuscriptId,
    title: manuscript.title,
    status,
    summary: {
      sections: sections.length,
      suggestions: suggestionDecisions.length,
      accepted: acceptQueue.length,
      deferred: deferQueue.length,
      escalated: escalationQueue.length,
      findings: suggestionDecisions.reduce((total, suggestion) => total + suggestion.findings.length, 0),
    },
    suggestions: suggestionDecisions,
    acceptQueue,
    deferQueue,
    escalationQueue,
    reviewQueue: suggestionDecisions.flatMap((suggestion) => suggestion.findings.map((finding) => ({
      manuscriptId: manuscript.manuscriptId,
      suggestionId: suggestion.suggestionId,
      code: finding.code,
      severity: finding.severity,
      action: findingAction(finding.code),
      remediation: finding.remediation,
    }))),
  }
}

function evaluateSuggestion(context) {
  const { suggestion, manuscript, sectionsById, comments, notebooks, authorsById, policy, asOf } = context
  const section = sectionsById.get(suggestion.sectionId)
  const checks = []
  const findings = []
  const approvals = Array.isArray(suggestion.approvals) ? suggestion.approvals : []
  const unresolvedReplies = comments.filter((comment) => (
    comment.suggestionId === suggestion.suggestionId &&
    comment.status !== "resolved" &&
    comment.blocking === true
  ))
  const relatedNotebookOutputs = notebooks.filter((output) => (
    Array.isArray(suggestion.relatedNotebookIds) &&
    suggestion.relatedNotebookIds.includes(output.notebookId)
  ))

  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "target_section_exists",
    severity: "critical",
    pass: Boolean(section),
    message: section ? "Target manuscript section exists." : "Target manuscript section is missing.",
    remediation: "Reconnect the suggestion to a current manuscript section before accepting it.",
    evidence: { sectionId: suggestion.sectionId },
  })

  const sectionHashMatch = Boolean(section && suggestion.baseSectionHash && suggestion.baseSectionHash === section.currentHash)
  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "section_version_hash_current",
    severity: "critical",
    pass: sectionHashMatch,
    message: sectionHashMatch
      ? "Suggestion base section hash matches the current section."
      : "Suggestion was prepared against a stale section hash.",
    remediation: "Rebase or re-review the suggestion against the current section version.",
    evidence: {
      expectedHash: suggestion.baseSectionHash || null,
      currentHash: section ? section.currentHash : null,
    },
  })

  const anchorStatus = evaluateAnchor(suggestion, section, policy)
  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "quote_anchor_stable",
    severity: "critical",
    pass: anchorStatus.pass,
    message: anchorStatus.pass
      ? "Quote anchor still resolves inside the target section."
      : "Quote anchor cannot be safely resolved in the target section.",
    remediation: "Refresh the quoted anchor and offsets before accepting the suggestion.",
    evidence: anchorStatus.evidence,
  })

  const lockStatus = evaluateLock(suggestion, section, policy)
  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "locked_section_rules_satisfied",
    severity: "critical",
    pass: lockStatus.pass,
    message: lockStatus.pass
      ? "Section lock rules permit this suggestion acceptance."
      : "Section lock rules block accepting this suggestion.",
    remediation: "Obtain the required lock override or wait for the protected section to reopen.",
    evidence: lockStatus.evidence,
  })

  const approvalStatus = evaluateApprovals(approvals, authorsById, policy)
  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "required_author_approvals_present",
    severity: "critical",
    pass: approvalStatus.pass,
    message: approvalStatus.pass
      ? "Required author approvals are present."
      : "Required author approvals are missing.",
    remediation: "Collect approval from the corresponding author or configured required role.",
    evidence: approvalStatus.evidence,
  })

  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "blocking_replies_resolved",
    severity: "critical",
    pass: unresolvedReplies.length === 0,
    message: unresolvedReplies.length === 0
      ? "No unresolved blocking reviewer replies remain."
      : `${unresolvedReplies.length} blocking reviewer replies remain unresolved.`,
    remediation: "Resolve blocking replies before accepting the suggestion.",
    evidence: { commentIds: unresolvedReplies.map((comment) => comment.commentId) },
  })

  const notebookStatus = evaluateNotebookFreshness(relatedNotebookOutputs, asOf, policy)
  addCheck(checks, findings, {
    suggestionId: suggestion.suggestionId,
    code: "notebook_outputs_fresh",
    severity: "warning",
    pass: notebookStatus.pass,
    message: notebookStatus.pass
      ? "Related notebook outputs are fresh enough for acceptance."
      : "Related notebook outputs are stale or missing.",
    remediation: "Re-run related notebook cells and attach fresh outputs before accepting the suggestion.",
    evidence: notebookStatus.evidence,
  })

  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")
  const decision = criticalFindings.length > 0
    ? "escalate"
    : warningFindings.length > 0
      ? "defer"
      : "accept"
  const provenancePayload = {
    manuscriptId: manuscript.manuscriptId,
    suggestionId: suggestion.suggestionId,
    sectionId: suggestion.sectionId,
    baseSectionHash: suggestion.baseSectionHash,
    quote: suggestion.quote,
    replacement: suggestion.replacement,
    approvals: approvals.map((approval) => ({
      authorId: approval.authorId,
      role: authorsById.get(approval.authorId) ? authorsById.get(approval.authorId).role : "unknown",
      approvedAt: approval.approvedAt,
    })),
    decision,
  }

  return {
    suggestionId: suggestion.suggestionId,
    sectionId: suggestion.sectionId,
    proposerId: suggestion.proposerId,
    decision,
    provenanceDigest: digest(provenancePayload),
    checks,
    findings,
  }
}

function evaluateAnchor(suggestion, section, policy) {
  if (!section || typeof section.text !== "string" || typeof suggestion.quote !== "string" || suggestion.quote.length === 0) {
    return {
      pass: false,
      evidence: { quote: suggestion.quote || null, resolvedIndex: null, expectedStart: suggestion.anchorStart ?? null },
    }
  }

  const resolvedIndex = section.text.indexOf(suggestion.quote)
  const expectedStart = Number.isFinite(suggestion.anchorStart) ? suggestion.anchorStart : resolvedIndex
  const drift = resolvedIndex < 0 ? null : Math.abs(resolvedIndex - expectedStart)

  return {
    pass: resolvedIndex >= 0 && drift <= policy.maxAnchorDrift,
    evidence: {
      quote: suggestion.quote,
      resolvedIndex,
      expectedStart,
      drift,
      maxAnchorDrift: policy.maxAnchorDrift,
    },
  }
}

function evaluateLock(suggestion, section, policy) {
  if (!section || !section.lock) {
    return { pass: true, evidence: { locked: false } }
  }

  const protectedType = policy.protectedSectionTypes.includes(section.type)
  const override = suggestion.lockOverride || {}
  const pass = !protectedType || (
    override.approved === true &&
    override.sectionHash === section.currentHash &&
    override.reason
  )

  return {
    pass,
    evidence: {
      locked: true,
      sectionType: section.type,
      protectedType,
      overrideApproved: override.approved === true,
      overrideSectionHash: override.sectionHash || null,
    },
  }
}

function evaluateApprovals(approvals, authorsById, policy) {
  const approvedRoles = approvals
    .filter((approval) => approval.status === "approved")
    .map((approval) => authorsById.get(approval.authorId))
    .filter(Boolean)
    .map((author) => author.role)
  const missingRoles = policy.requiredApprovalRoles.filter((role) => !approvedRoles.includes(role))

  return {
    pass: missingRoles.length === 0,
    evidence: {
      approvedRoles,
      missingRoles,
      requiredApprovalRoles: policy.requiredApprovalRoles,
    },
  }
}

function evaluateNotebookFreshness(outputs, asOf, policy) {
  if (outputs.length === 0) {
    return { pass: true, evidence: { notebookIds: [], staleNotebookIds: [], maxNotebookAgeMinutes: policy.maxNotebookAgeMinutes } }
  }

  const now = Date.parse(asOf)
  const staleNotebookIds = outputs
    .filter((output) => {
      const ranAt = Date.parse(output.executedAt || "")
      if (!Number.isFinite(ranAt) || output.status !== "fresh") {
        return true
      }

      return ((now - ranAt) / 60000) > policy.maxNotebookAgeMinutes
    })
    .map((output) => output.notebookId)

  return {
    pass: staleNotebookIds.length === 0,
    evidence: {
      notebookIds: outputs.map((output) => output.notebookId),
      staleNotebookIds,
      maxNotebookAgeMinutes: policy.maxNotebookAgeMinutes,
    },
  }
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
      suggestionId: check.suggestionId,
      code: check.code,
      severity: check.severity,
      message: check.message,
      remediation: check.remediation,
      evidence: check.evidence || {},
    })
  }
}

function summarize(decisions, reviewQueue) {
  const suggestions = decisions.flatMap((manuscript) => manuscript.suggestions)
  return {
    totalManuscripts: decisions.length,
    acceptanceReadyManuscripts: decisions.filter((manuscript) => manuscript.status === "acceptance_ready").length,
    deferredManuscripts: decisions.filter((manuscript) => manuscript.status === "acceptance_deferred").length,
    blockedManuscripts: decisions.filter((manuscript) => manuscript.status === "acceptance_blocked").length,
    totalSuggestions: suggestions.length,
    acceptedSuggestions: suggestions.filter((suggestion) => suggestion.decision === "accept").length,
    deferredSuggestions: suggestions.filter((suggestion) => suggestion.decision === "defer").length,
    escalatedSuggestions: suggestions.filter((suggestion) => suggestion.decision === "escalate").length,
    totalFindings: reviewQueue.length,
    criticalFindings: reviewQueue.filter((item) => item.severity === "critical").length,
    warningFindings: reviewQueue.filter((item) => item.severity === "warning").length,
  }
}

function findingAction(code) {
  const actions = {
    target_section_exists: "reconnect_suggestion_target",
    section_version_hash_current: "rebase_suggestion_to_current_section",
    quote_anchor_stable: "refresh_quote_anchor",
    locked_section_rules_satisfied: "obtain_lock_override",
    required_author_approvals_present: "collect_author_approval",
    blocking_replies_resolved: "resolve_blocking_replies",
    notebook_outputs_fresh: "rerun_related_notebooks",
  }

  return actions[code] || "suggestion_acceptance_followup"
}

function digest(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateSuggestionAcceptanceProvenance,
}
