'use strict';

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  asOfDate: '2026-05-22',
  recoveryWindowDays: 30,
  minimumCoOwnerConsentRatio: 0.66,
  auditReceiptRetentionDays: 2555,
  mfaFreshnessDays: 7,
  stewardHoldTypes: ['legal_hold', 'irb_retention', 'funder_retention', 'publication_review', 'restricted_data_lock'],
  preservedReceiptFields: [
    'request_id',
    'request_type',
    'actor_hash',
    'project_hash',
    'decision',
    'policy_digest',
    'timestamp'
  ]
});

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toDate(dateValue, fieldName) {
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  if (!dateValue || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${dateValue}`);
  }
  return parsed;
}

function daysBetween(startDate, endDate) {
  return Math.floor((toDate(endDate, 'endDate') - toDate(startDate, 'startDate')) / DAY_MS);
}

function isFreshMfa(actor, policy) {
  if (!actor || !actor.mfaVerifiedAt) return false;
  const ageDays = daysBetween(actor.mfaVerifiedAt, policy.asOfDate);
  return ageDays >= 0 && ageDays <= policy.mfaFreshnessDays;
}

function getActiveHolds(request, policy) {
  return (request.holds || []).filter((hold) => {
    if (hold.status === 'resolved' || hold.status === 'released') return false;
    if (hold.expiresAt && daysBetween(policy.asOfDate, hold.expiresAt) < 0) return false;
    return policy.stewardHoldTypes.includes(hold.type);
  });
}

function getCoOwnerConsentRatio(project) {
  const coOwners = project.coOwners || [];
  if (coOwners.length === 0) return 1;
  const approved = coOwners.filter((owner) => owner.consent === 'approved').length;
  return approved / coOwners.length;
}

function requiresCitationTombstone(project) {
  const citations = project.citations || {};
  return Boolean(citations.doi || citations.publicCitations > 0 || citations.downstreamForks > 0 || project.visibility === 'public');
}

function hasAnonymousEscrowDependency(request) {
  const escrow = request.anonymousReviewEscrow || {};
  return Boolean(escrow.activePseudonyms || escrow.pendingAppeals || escrow.deanonymizationHolds);
}

function getRecoveryWindowDays(request, policy) {
  const requested = Number(request.recoveryWindowDays);
  if (!Number.isFinite(requested)) return policy.recoveryWindowDays;
  return Math.max(0, Math.floor(requested));
}

function selectDecision(request, policy) {
  const actor = request.actor || {};
  const project = request.project || {};
  const activeHolds = getActiveHolds(request, policy);
  const consentRatio = getCoOwnerConsentRatio(project);
  const needsTombstone = requiresCitationTombstone(project);
  const hasEscrow = hasAnonymousEscrowDependency(request);
  const recoveryWindowDays = getRecoveryWindowDays(request, policy);

  if (!actor.identityVerified || !isFreshMfa(actor, policy)) {
    return {
      action: 'hold_identity_verification',
      severity: 'high',
      reason: 'requester identity or fresh MFA proof is missing',
      finalizationMode: 'blocked'
    };
  }

  if (!['owner', 'admin', 'data_steward'].includes(actor.projectRole)) {
    return {
      action: 'hold_authority_review',
      severity: 'high',
      reason: `role ${actor.projectRole || 'unknown'} cannot finalize deletion or erasure`,
      finalizationMode: 'blocked'
    };
  }

  if (activeHolds.length > 0) {
    return {
      action: 'steward_review_required',
      severity: 'critical',
      reason: `active retention holds: ${activeHolds.map((hold) => hold.type).join(', ')}`,
      finalizationMode: 'blocked'
    };
  }

  if (request.type === 'project_deletion' && consentRatio < policy.minimumCoOwnerConsentRatio) {
    return {
      action: 'collect_coowner_consent',
      severity: 'high',
      reason: `co-owner consent ratio ${consentRatio.toFixed(2)} is below policy threshold ${policy.minimumCoOwnerConsentRatio}`,
      finalizationMode: 'blocked'
    };
  }

  if (hasEscrow) {
    return {
      action: 'preserve_anonymous_review_escrow',
      severity: 'medium',
      reason: 'anonymous review pseudonyms or appeals require escrow-preserving erasure',
      finalizationMode: 'redacted_erasure'
    };
  }

  if (request.type === 'profile_erasure' && (request.linkedProjects || []).some((projectRef) => projectRef.role !== 'viewer')) {
    return {
      action: 'detach_profile_preserve_attribution',
      severity: 'medium',
      reason: 'profile has authored or administered project links that need attribution-preserving detachment',
      finalizationMode: 'redacted_erasure'
    };
  }

  if (needsTombstone) {
    return {
      action: 'approve_tombstone_delete',
      severity: 'medium',
      reason: 'public DOI, citation, fork, or visibility evidence requires a citation-safe tombstone',
      finalizationMode: 'tombstone'
    };
  }

  if (recoveryWindowDays < policy.recoveryWindowDays) {
    return {
      action: 'extend_recovery_window',
      severity: 'medium',
      reason: `recovery window ${recoveryWindowDays} day(s) is below policy minimum ${policy.recoveryWindowDays}`,
      finalizationMode: 'recoverable_delete'
    };
  }

  return {
    action: 'approve_recoverable_delete',
    severity: 'low',
    reason: 'private project/profile has verified authority, no holds, and policy recovery window',
    finalizationMode: 'recoverable_delete'
  };
}

function buildActions(request, decision, policy) {
  const actions = [];

  if (decision.action === 'hold_identity_verification') {
    actions.push('request fresh MFA and identity verification before evaluating deletion');
    actions.push('do not remove project, profile, audit, or access-control state');
  } else if (decision.action === 'hold_authority_review') {
    actions.push('route request to project owner or institutional steward');
    actions.push('preserve current permissions until authority is confirmed');
  } else if (decision.action === 'steward_review_required') {
    actions.push('freeze destructive deletion until all retention holds are released');
    actions.push('attach legal/IRB/funder hold evidence to steward packet');
  } else if (decision.action === 'collect_coowner_consent') {
    actions.push('collect co-owner consent or transfer ownership before deletion');
    actions.push('notify active collaborators of pending deletion window');
  } else if (decision.action === 'preserve_anonymous_review_escrow') {
    actions.push('replace profile fields with pseudonymous labels');
    actions.push('preserve escrow receipts required for appeals without exposing identity');
  } else if (decision.action === 'detach_profile_preserve_attribution') {
    actions.push('remove public profile fields and login identifiers');
    actions.push('preserve minimal attribution hashes on authored projects and reviews');
  } else if (decision.action === 'approve_tombstone_delete') {
    actions.push('create citation-safe project tombstone with DOI/version redirect');
    actions.push('remove editable workspace state after recovery window expires');
  } else if (decision.action === 'extend_recovery_window') {
    actions.push(`set recoverability window to ${policy.recoveryWindowDays} days`);
    actions.push('queue final hard-delete review after recovery window');
  } else {
    actions.push('approve recoverable deletion and schedule final purge after recovery window');
    actions.push('retain minimized audit receipt only');
  }

  actions.push(`retain minimized audit receipt for ${policy.auditReceiptRetentionDays} days`);
  return actions;
}

function calculateRiskScore(request, decision, policy) {
  let score = 0;
  const activeHolds = getActiveHolds(request, policy);
  const project = request.project || {};

  score += activeHolds.length * 25;
  if (decision.severity === 'critical') score += 35;
  if (decision.severity === 'high') score += 25;
  if (decision.severity === 'medium') score += 12;
  if (requiresCitationTombstone(project)) score += 10;
  if (hasAnonymousEscrowDependency(request)) score += 10;
  if ((project.activeCollaborators || 0) > 0) score += Math.min(15, project.activeCollaborators * 3);
  if (!request.actor || !request.actor.identityVerified) score += 20;

  return Math.max(0, Math.min(100, score));
}

function evaluateRequest(request, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {}, {
    asOfDate: options.asOfDate || (options.policy && options.policy.asOfDate) || DEFAULT_POLICY.asOfDate
  });

  if (!['project_deletion', 'profile_erasure'].includes(request.type)) {
    throw new Error(`Unsupported request type: ${request.type}`);
  }
  toDate(request.requestedAt, 'requestedAt');
  toDate(policy.asOfDate, 'asOfDate');

  const decision = selectDecision(request, policy);
  const activeHolds = getActiveHolds(request, policy);
  const project = request.project || {};
  const packet = {
    requestId: request.id,
    type: request.type,
    requesterRole: request.actor && request.actor.projectRole,
    projectId: project.id || null,
    projectVisibility: project.visibility || null,
    action: decision.action,
    severity: decision.severity,
    reason: decision.reason,
    finalizationMode: decision.finalizationMode,
    activeHoldTypes: activeHolds.map((hold) => hold.type),
    coOwnerConsentRatio: Number(getCoOwnerConsentRatio(project).toFixed(2)),
    citationTombstoneRequired: requiresCitationTombstone(project),
    anonymousEscrowRequired: hasAnonymousEscrowDependency(request),
    recoveryWindowDays: getRecoveryWindowDays(request, policy),
    riskScore: calculateRiskScore(request, decision, policy),
    retainedReceiptFields: policy.preservedReceiptFields.slice(),
    actions: buildActions(request, decision, policy),
    policySnapshot: {
      asOfDate: policy.asOfDate,
      recoveryWindowDays: policy.recoveryWindowDays,
      minimumCoOwnerConsentRatio: policy.minimumCoOwnerConsentRatio,
      mfaFreshnessDays: policy.mfaFreshnessDays,
      auditReceiptRetentionDays: policy.auditReceiptRetentionDays
    }
  };

  packet.auditDigest = digest({
    request: sanitizeRequest(request),
    packet: Object.assign({}, packet, { auditDigest: undefined })
  });

  return packet;
}

function sanitizeRequest(request) {
  const project = request.project || {};
  const actor = request.actor || {};
  return {
    id: request.id,
    type: request.type,
    requestedAt: request.requestedAt,
    actorHash: digest({
      role: actor.projectRole,
      verified: Boolean(actor.identityVerified),
      mfaVerifiedAt: actor.mfaVerifiedAt || null
    }).slice(0, 16),
    projectHash: project.id ? digest({
      id: project.id,
      visibility: project.visibility,
      activeCollaborators: project.activeCollaborators || 0
    }).slice(0, 16) : null,
    holdCount: (request.holds || []).length,
    linkedProjectCount: (request.linkedProjects || []).length,
    anonymousEscrowRequired: hasAnonymousEscrowDependency(request)
  };
}

function evaluateBatch(requests, options = {}) {
  const packets = requests.map((request) => evaluateRequest(request, options));
  const summary = packets.reduce((acc, packet) => {
    acc.byAction[packet.action] = (acc.byAction[packet.action] || 0) + 1;
    acc.byMode[packet.finalizationMode] = (acc.byMode[packet.finalizationMode] || 0) + 1;
    if (packet.severity === 'high' || packet.severity === 'critical') {
      acc.blockedRequests.push(packet.requestId);
    }
    return acc;
  }, {
    byAction: {},
    byMode: {},
    blockedRequests: []
  });

  const batch = {
    asOfDate: options.asOfDate || DEFAULT_POLICY.asOfDate,
    requestCount: packets.length,
    byAction: summary.byAction,
    byMode: summary.byMode,
    blockedRequests: summary.blockedRequests,
    packets
  };

  batch.auditDigest = digest(batch);
  return batch;
}

module.exports = {
  DEFAULT_POLICY,
  daysBetween,
  digest,
  evaluateBatch,
  evaluateRequest,
  getActiveHolds,
  getCoOwnerConsentRatio,
  requiresCitationTombstone
};
