const crypto = require('crypto');

const SENSITIVE_ACTIONS = new Set([
  'publish_release',
  'restricted_data_export',
  'archive_freeze',
  'role_transfer',
]);

const ALLOWED_SCOPES_BY_ACTION = {
  publish_release: new Set(['manuscript:approve', 'metadata:update', 'release:submit']),
  restricted_data_export: new Set(['dataset:read', 'export:restricted']),
  archive_freeze: new Set(['archive:freeze', 'citation:snapshot']),
  role_transfer: new Set(['role:transfer']),
};

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

function addHold(holds, request, code, owner, evidence, requiredAction) {
  holds.push({
    requestId: request.requestId,
    code,
    owner,
    severity: 'blocker',
    evidence,
    requiredAction,
  });
}

function addWarning(warnings, request, code, owner, evidence, requiredAction) {
  warnings.push({
    requestId: request.requestId,
    code,
    owner,
    severity: 'warning',
    evidence,
    requiredAction,
  });
}

function evaluateRequest(request, workspace, options) {
  const usersById = new Map(workspace.users.map((user) => [user.userId, user]));
  const delegate = usersById.get(request.delegateId);
  const holds = [];
  const warnings = [];
  const sensitive = SENSITIVE_ACTIONS.has(request.action);

  if (toTime(request.expiresAt) < toTime(options.asOf)) {
    addHold(
      holds,
      request,
      'delegation_expired',
      request.delegateId,
      `${request.requestId} expired on ${request.expiresAt}.`,
      'Create a new delegation request before approving the sensitive action.',
    );
  } else if (daysUntil(request.expiresAt, options.asOf) <= workspace.policy.nearExpiryWarningDays) {
    addWarning(
      warnings,
      request,
      'delegation_near_expiry',
      request.delegateId,
      `${request.requestId} expires in ${daysUntil(request.expiresAt, options.asOf)} days.`,
      'Confirm the delegated authority will still be valid when the action executes.',
    );
  }

  if (sensitive && !request.sponsorApproval) {
    addHold(
      holds,
      request,
      'missing_sponsor_approval',
      request.sponsorId,
      `${request.action} requires sponsor approval before ${request.delegateId} can act.`,
      'Record sponsor approval or route the action back to the project owner.',
    );
  }

  if (request.requiresIdentityPosture) {
    const missing = request.requiresIdentityPosture.filter((flag) => !delegate.identity[flag]);
    if (missing.length > 0) {
      addHold(
        holds,
        request,
        'identity_posture_gap',
        request.delegateId,
        `${delegate.name} is missing ${missing.join(', ')} for ${request.action}.`,
        'Block the delegation until MFA, SAML, and ORCID posture requirements are satisfied.',
      );
    }
  }

  if (sensitive && (request.approverId === request.requestorId || request.approverId === request.delegateId)) {
    addHold(
      holds,
      request,
      'separation_of_duties_violation',
      request.approverId,
      `${request.approverId} cannot both request/delegate and approve ${request.action}.`,
      'Route approval to an independent owner or institutional sponsor.',
    );
  }

  const allowedScopes = ALLOWED_SCOPES_BY_ACTION[request.action] || new Set();
  const extraScopes = request.scopes.filter((scope) => !allowedScopes.has(scope));
  if (extraScopes.length > 0) {
    addHold(
      holds,
      request,
      'delegated_scope_exceeds_action',
      request.delegateId,
      `${request.requestId} includes excess scope(s): ${extraScopes.join(', ')}.`,
      'Narrow the object-level delegation scope before approving the action.',
    );
  }

  const holdCodes = new Set(holds.map((hold) => hold.code));
  const decision = holdCodes.has('missing_sponsor_approval') && holds.length === 1
    ? 'needs_sponsor'
    : holds.length > 0
      ? 'block'
      : 'approve';

  return {
    decision: {
      requestId: request.requestId,
      action: request.action,
      delegateId: request.delegateId,
      decision,
      expiresAt: request.expiresAt,
    },
    holds,
    warnings,
  };
}

function evaluateDelegationRequests(workspace, options = {}) {
  const evaluationOptions = {
    asOf: options.asOf || new Date().toISOString(),
  };
  const decisions = [];
  const holds = [];
  const warnings = [];

  for (const request of workspace.delegationRequests) {
    const result = evaluateRequest(request, workspace, evaluationOptions);
    decisions.push(result.decision);
    holds.push(...result.holds);
    warnings.push(...result.warnings);
  }

  const sortedHolds = holds.sort((left, right) => left.code.localeCompare(right.code));
  const sortedWarnings = warnings.sort((left, right) => left.code.localeCompare(right.code));

  return {
    workspaceId: workspace.workspaceId,
    overallStatus: sortedHolds.length > 0 ? 'hold' : 'ready',
    summary: {
      requestsReviewed: workspace.delegationRequests.length,
      blockingHolds: sortedHolds.length,
      warnings: sortedWarnings.length,
      approved: decisions.filter((decision) => decision.decision === 'approve').length,
      blocked: decisions.filter((decision) => decision.decision === 'block').length,
    },
    decisions,
    holds: sortedHolds,
    warnings: sortedWarnings,
  };
}

function buildDelegationReviewPacket(workspace, options = {}) {
  const review = evaluateDelegationRequests(workspace, options);
  const packet = {
    packetType: 'project-role-delegation-guard',
    workspaceId: review.workspaceId,
    generatedAt: options.asOf || new Date().toISOString(),
    overallStatus: review.overallStatus,
    decisions: review.decisions,
    holds: review.holds,
    warnings: review.warnings,
    approvalChecklist: review.holds.map((hold) => ({
      requestId: hold.requestId,
      owner: hold.owner,
      requiredAction: hold.requiredAction,
      evidence: hold.evidence,
    })),
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  evaluateDelegationRequests,
  buildDelegationReviewPacket,
  stableStringify,
  digest,
};
