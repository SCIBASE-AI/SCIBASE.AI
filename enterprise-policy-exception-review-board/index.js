const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toTime(value) {
  return new Date(value).getTime();
}

function daysUntil(value, asOf) {
  return Math.ceil((toTime(value) - toTime(asOf)) / 86_400_000);
}

function addFinding(findings, exception, code, owner, evidence, requiredAction) {
  findings.push({
    exceptionId: exception.exceptionId,
    code,
    owner,
    severity: 'blocker',
    evidence,
    requiredAction,
  });
}

function addWarning(warnings, exception, code, owner, evidence, requiredAction) {
  warnings.push({
    exceptionId: exception.exceptionId,
    code,
    owner,
    severity: 'warning',
    evidence,
    requiredAction,
  });
}

function evaluateException(exception, institution, options) {
  const findings = [];
  const warnings = [];
  const owner = institution.owners.find((candidate) => candidate.ownerId === exception.ownerId);

  const missingApprovals = exception.requiredApprovals.filter((approval) => !exception.approvals[approval]);
  if (missingApprovals.length > 0) {
    addFinding(
      findings,
      exception,
      'missing_required_approval',
      exception.ownerId || 'exception-board',
      `${exception.exceptionId} lacks required approval(s): ${missingApprovals.join(', ')}.`,
      'Collect all required DPA, funder, security, and data-steward approvals before granting the exception.',
    );
  }

  if (toTime(exception.expiresAt) < toTime(options.asOf)) {
    addFinding(
      findings,
      exception,
      'expired_exception',
      exception.ownerId || 'exception-board',
      `${exception.exceptionId} expired on ${exception.expiresAt}.`,
      'Expire the exception and force a new review before the integration or export runs again.',
    );
  } else if (daysUntil(exception.expiresAt, options.asOf) <= institution.policy.nearExpiryWarningDays) {
    addWarning(
      warnings,
      exception,
      'exception_near_expiry',
      exception.ownerId || 'exception-board',
      `${exception.exceptionId} expires in ${daysUntil(exception.expiresAt, options.asOf)} days.`,
      'Schedule renewal or retire the exception before the approval window closes.',
    );
  }

  const missingControls = exception.requiredControls.filter((control) => !exception.controls.includes(control));
  if (missingControls.length > 0) {
    addFinding(
      findings,
      exception,
      'compensating_control_gap',
      exception.ownerId || 'exception-board',
      `${exception.exceptionId} lacks compensating control(s): ${missingControls.join(', ')}.`,
      'Attach compensating controls such as scoped tokens, export hold, audit sampling, or encryption.',
    );
  }

  if (!owner || !owner.active) {
    addFinding(
      findings,
      exception,
      'owner_accountability_missing',
      exception.ownerId || 'exception-board',
      `${exception.exceptionId} has no active accountable owner.`,
      'Assign an active institutional owner before the exception can remain open.',
    );
  }

  let decision = 'approve_with_controls';
  if (findings.some((finding) => finding.code === 'expired_exception')) {
    decision = 'expire';
  } else if (findings.length > 0) {
    decision = 'block';
  }

  return {
    decision: {
      exceptionId: exception.exceptionId,
      category: exception.category,
      ownerId: exception.ownerId,
      decision,
      expiresAt: exception.expiresAt,
      controls: exception.controls,
    },
    findings,
    warnings,
  };
}

function evaluatePolicyExceptions(institution, options = {}) {
  const evaluationOptions = {
    asOf: options.asOf || new Date().toISOString(),
  };
  const decisions = [];
  const findings = [];
  const warnings = [];

  for (const exception of institution.exceptions) {
    const result = evaluateException(exception, institution, evaluationOptions);
    decisions.push(result.decision);
    findings.push(...result.findings);
    warnings.push(...result.warnings);
  }

  const sortedFindings = findings.sort((left, right) => left.code.localeCompare(right.code));
  const sortedWarnings = warnings.sort((left, right) => left.code.localeCompare(right.code));

  return {
    institutionId: institution.institutionId,
    overallStatus: sortedFindings.length > 0 ? 'review_required' : 'ready',
    summary: {
      exceptionsReviewed: institution.exceptions.length,
      blockingFindings: sortedFindings.length,
      warnings: sortedWarnings.length,
      blocked: decisions.filter((decision) => decision.decision === 'block').length,
      expiring: decisions.filter((decision) => decision.decision === 'expire').length,
    },
    decisions,
    findings: sortedFindings,
    warnings: sortedWarnings,
  };
}

function buildPolicyExceptionPacket(institution, options = {}) {
  const generatedAt = options.asOf || new Date().toISOString();
  const review = evaluatePolicyExceptions(institution, { asOf: generatedAt });
  const packet = {
    packetType: 'enterprise-policy-exception-review-board',
    institutionId: review.institutionId,
    generatedAt,
    overallStatus: review.overallStatus,
    decisions: review.decisions,
    findings: review.findings,
    warnings: review.warnings,
    adminMetrics: {
      openExceptions: institution.exceptions.length,
      blockedExceptions: review.decisions.filter((decision) => decision.decision === 'block').length,
      expiredExceptions: review.decisions.filter((decision) => decision.decision === 'expire').length,
      renewalWarnings: review.warnings.length,
    },
    webhookEvents: review.findings.map((finding) => ({
      eventType: 'policy_exception.finding',
      exceptionId: finding.exceptionId,
      code: finding.code,
      signatureBase: `${review.institutionId}:${finding.exceptionId}:${finding.code}:${generatedAt}`,
    })),
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  evaluatePolicyExceptions,
  buildPolicyExceptionPacket,
  stableStringify,
  digest,
};
