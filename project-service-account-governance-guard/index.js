'use strict';

const crypto = require('crypto');

const DEFAULTS = {
  maxTokenAgeDays: 90,
  maxIdleDays: 60,
  rotationWarningDays: 14,
  allowedAutomationScopes: new Set([
    'repo:read',
    'repo:write',
    'artifact:read',
    'artifact:write',
    'ci:run',
    'dataset:import',
    'metadata:update',
  ]),
  privilegedScopes: new Set([
    '*',
    'admin:*',
    'project:owner',
    'members:write',
    'billing:write',
    'restricted-data:export',
    'secrets:read',
  ]),
};

const DECISION_RANK = {
  approved: 0,
  needs_rotation: 1,
  suspended: 2,
  revoked: 3,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(start, end) {
  return Math.abs(end.getTime() - start.getTime()) / 864e5;
}

function daysUntil(start, end) {
  return (end.getTime() - start.getTime()) / 864e5;
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({
    severity,
    code,
    message,
    evidence,
  });
}

function ownerById(input) {
  return new Map((input.humanOwners || []).map((owner) => [owner.id, owner]));
}

function sponsorById(input) {
  return new Map((input.sponsors || []).map((sponsor) => [sponsor.id, sponsor]));
}

function validateIdentity(account, findings) {
  let decision = 'approved';

  if (!account.projectId || !account.accountId || !account.ownerId) {
    addFinding(findings, 'blocker', 'service_account_identity_missing', 'Service account requires project, account, and human owner identifiers.', {
      projectId: account.projectId || null,
      accountId: account.accountId || null,
      ownerId: account.ownerId || null,
    });
    decision = worstDecision(decision, 'revoked');
  }

  if (!Array.isArray(account.scopes) || account.scopes.length === 0) {
    addFinding(findings, 'blocker', 'service_account_scope_missing', 'Service account cannot remain active without explicit scoped grants.', {
      accountId: account.accountId || null,
    });
    decision = worstDecision(decision, 'suspended');
  }

  return decision;
}

function evaluateOwner(account, owners, sponsors, findings) {
  let decision = 'approved';
  const owner = owners.get(account.ownerId);
  const sponsor = sponsors.get(account.sponsorId);

  if (!owner || owner.status !== 'active') {
    addFinding(findings, 'blocker', 'human_owner_inactive', 'Project service account must have an active accountable human owner.', {
      accountId: account.accountId,
      ownerId: account.ownerId,
      ownerStatus: owner ? owner.status : 'missing',
    });
    decision = worstDecision(decision, 'revoked');
  }

  if (owner && (!owner.mfaVerified || !owner.samlVerified || !owner.orcidVerified)) {
    addFinding(findings, 'warning', 'owner_assurance_incomplete', 'Owner assurance should include MFA, SAML, and ORCID evidence before renewal.', {
      accountId: account.accountId,
      ownerId: owner.id,
      mfaVerified: Boolean(owner.mfaVerified),
      samlVerified: Boolean(owner.samlVerified),
      orcidVerified: Boolean(owner.orcidVerified),
    });
    decision = worstDecision(decision, 'needs_rotation');
  }

  if (!sponsor || sponsor.status !== 'active') {
    addFinding(findings, 'warning', 'service_account_sponsor_missing', 'Automation accounts should have an active project sponsor for renewal review.', {
      accountId: account.accountId,
      sponsorId: account.sponsorId || null,
      sponsorStatus: sponsor ? sponsor.status : 'missing',
    });
    decision = worstDecision(decision, 'needs_rotation');
  }

  return decision;
}

function evaluateScopes(account, findings) {
  let decision = 'approved';
  const scopes = account.scopes || [];
  const privileged = scopes.filter((scope) => DEFAULTS.privilegedScopes.has(scope));
  const unknown = scopes.filter((scope) => !DEFAULTS.allowedAutomationScopes.has(scope) && !DEFAULTS.privilegedScopes.has(scope));

  if (privileged.length > 0) {
    addFinding(findings, 'blocker', 'privileged_scope_on_service_account', 'Service account has owner, admin, secret, billing, or restricted-export scope.', {
      accountId: account.accountId,
      privileged,
    });
    decision = worstDecision(decision, 'suspended');
  }

  if (unknown.length > 0) {
    addFinding(findings, 'warning', 'unknown_automation_scope', 'Scope should be reviewed before renewal because it is outside the approved automation set.', {
      accountId: account.accountId,
      unknown,
    });
    decision = worstDecision(decision, 'needs_rotation');
  }

  if (scopes.length > 4) {
    addFinding(findings, 'warning', 'service_account_scope_bloat', 'Service account has more scopes than expected for a narrow automation task.', {
      accountId: account.accountId,
      scopeCount: scopes.length,
    });
    decision = worstDecision(decision, 'needs_rotation');
  }

  return decision;
}

function evaluateTokenLifecycle(account, checkedAt, findings) {
  let decision = 'approved';
  const issuedAt = asDate(account.token?.issuedAt);
  const lastRotatedAt = asDate(account.token?.lastRotatedAt);
  const lastUsedAt = asDate(account.token?.lastUsedAt);
  const expiresAt = asDate(account.token?.expiresAt);
  const rotationBase = lastRotatedAt || issuedAt;

  if (!issuedAt || !rotationBase || !expiresAt) {
    addFinding(findings, 'blocker', 'token_lifecycle_evidence_missing', 'Token issue, rotation, and expiry evidence is required for project service accounts.', {
      accountId: account.accountId,
      issuedAt: account.token?.issuedAt || null,
      lastRotatedAt: account.token?.lastRotatedAt || null,
      expiresAt: account.token?.expiresAt || null,
    });
    decision = worstDecision(decision, 'suspended');
  }

  if (rotationBase) {
    const tokenAgeDays = daysBetween(rotationBase, checkedAt);
    if (tokenAgeDays > DEFAULTS.maxTokenAgeDays) {
      addFinding(findings, 'blocker', 'token_rotation_overdue', 'Service account token exceeds the rotation window.', {
        accountId: account.accountId,
        tokenAgeDays: Number(tokenAgeDays.toFixed(1)),
        limitDays: DEFAULTS.maxTokenAgeDays,
      });
      decision = worstDecision(decision, 'suspended');
    }
  }

  if (lastUsedAt) {
    const idleDays = daysBetween(lastUsedAt, checkedAt);
    if (idleDays > DEFAULTS.maxIdleDays) {
      addFinding(findings, 'warning', 'service_account_idle', 'Unused service account should be rotated, disabled, or renewed by owner review.', {
        accountId: account.accountId,
        idleDays: Number(idleDays.toFixed(1)),
        limitDays: DEFAULTS.maxIdleDays,
      });
      decision = worstDecision(decision, 'needs_rotation');
    }
  }

  if (expiresAt) {
    const expiresInDays = daysUntil(checkedAt, expiresAt);
    if (expiresInDays < 0) {
      addFinding(findings, 'blocker', 'service_account_token_expired', 'Expired service account token must be revoked or reissued.', {
        accountId: account.accountId,
        expiresInDays: Number(expiresInDays.toFixed(1)),
      });
      decision = worstDecision(decision, 'revoked');
    } else if (expiresInDays <= DEFAULTS.rotationWarningDays) {
      addFinding(findings, 'warning', 'service_account_expiring_soon', 'Service account token is close to expiry and should be rotated.', {
        accountId: account.accountId,
        expiresInDays: Number(expiresInDays.toFixed(1)),
      });
      decision = worstDecision(decision, 'needs_rotation');
    }
  }

  return decision;
}

function evaluateIntegration(account, findings) {
  let decision = 'approved';

  if (account.externalIntegration && !account.externalIntegration.approvedVendor) {
    addFinding(findings, 'warning', 'external_integration_unapproved', 'External integration requires vendor approval before token renewal.', {
      accountId: account.accountId,
      provider: account.externalIntegration.provider,
    });
    decision = worstDecision(decision, 'needs_rotation');
  }

  if (account.externalIntegration?.dataExport && !account.externalIntegration.dataUseAgreement) {
    addFinding(findings, 'blocker', 'external_data_export_without_dua', 'External data export integration is missing data-use agreement evidence.', {
      accountId: account.accountId,
      provider: account.externalIntegration.provider,
    });
    decision = worstDecision(decision, 'suspended');
  }

  if (account.secretExposure) {
    addFinding(findings, 'blocker', 'service_account_secret_exposed', 'Secret exposure requires immediate token revocation and owner notification.', {
      accountId: account.accountId,
      exposure: account.secretExposure,
    });
    decision = worstDecision(decision, 'revoked');
  }

  return decision;
}

function actionForDecision(decision) {
  if (decision === 'approved') {
    return 'renew';
  }
  if (decision === 'needs_rotation') {
    return 'rotate_before_renewal';
  }
  if (decision === 'suspended') {
    return 'suspend_until_reviewed';
  }
  return 'revoke';
}

function evaluateServiceAccount(account, checkedAt, owners, sponsors, findings) {
  let decision = validateIdentity(account, findings);
  decision = worstDecision(decision, evaluateOwner(account, owners, sponsors, findings));
  decision = worstDecision(decision, evaluateScopes(account, findings));
  decision = worstDecision(decision, evaluateTokenLifecycle(account, checkedAt, findings));
  decision = worstDecision(decision, evaluateIntegration(account, findings));

  return {
    projectId: account.projectId || null,
    accountId: account.accountId || null,
    ownerId: account.ownerId || null,
    sponsorId: account.sponsorId || null,
    decision,
    action: actionForDecision(decision),
    scopeCount: Array.isArray(account.scopes) ? account.scopes.length : 0,
    externalIntegration: account.externalIntegration ? account.externalIntegration.provider : null,
    ownerStatus: owners.get(account.ownerId)?.status || 'missing',
    tokenDigest: digest({
      accountId: account.accountId,
      scopes: account.scopes || [],
      token: account.token || {},
      decision,
    }),
  };
}

function buildReviewerTasks(findings, accounts) {
  const tasks = [];

  if (accounts.some((account) => account.action === 'revoke')) {
    tasks.push('Revoke orphaned or exposed service-account tokens and notify the accountable project owners.');
  }

  if (findings.some((finding) => finding.code === 'privileged_scope_on_service_account' || finding.code === 'external_data_export_without_dua')) {
    tasks.push('Suspend privileged or external-export automation until least-privilege scope and data-use evidence are approved.');
  }

  if (findings.some((finding) => finding.code.includes('rotation') || finding.code.includes('expiring'))) {
    tasks.push('Queue token rotation before renewing project automation access.');
  }

  if (accounts.every((account) => account.decision === 'approved')) {
    tasks.push('Renew approved service accounts and publish the audit digest to the project access log.');
  }

  return tasks;
}

function evaluateServiceAccountGovernance(input) {
  const checkedAt = asDate(input.checkedAt) || new Date();
  const findings = [];
  const owners = ownerById(input);
  const sponsors = sponsorById(input);
  const accounts = (input.serviceAccounts || []).map((account) => evaluateServiceAccount(account, checkedAt, owners, sponsors, findings));
  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    checkedAt: checkedAt.toISOString(),
    decision: accounts.some((account) => account.decision === 'revoked') ? 'revoked'
      : accounts.some((account) => account.decision === 'suspended') ? 'suspended'
        : accounts.some((account) => account.decision === 'needs_rotation') ? 'needs_rotation'
          : 'approved',
    summary: {
      totalAccounts: accounts.length,
      approved: accounts.filter((account) => account.decision === 'approved').length,
      needsRotation: accounts.filter((account) => account.decision === 'needs_rotation').length,
      suspended: accounts.filter((account) => account.decision === 'suspended').length,
      revoked: accounts.filter((account) => account.decision === 'revoked').length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    accounts,
    blockers,
    warnings,
    reviewerTasks: buildReviewerTasks(findings, accounts),
    accessHold: accounts.some((account) => account.decision === 'suspended' || account.decision === 'revoked'),
    auditDigest: digest({
      checkedAt: checkedAt.toISOString(),
      accounts,
      findings,
    }),
  };
}

module.exports = {
  evaluateServiceAccountGovernance,
  stableStringify,
  digest,
};
