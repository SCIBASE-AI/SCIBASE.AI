'use strict';

const DEFAULT_NOW = '2026-05-21T09:00:00.000Z';
const HOUR = 60 * 60 * 1000;

const REQUIRED_ARTIFACT_CLASSES = new Set(['dataset', 'protocol', 'notebook']);
const APPROVED_ROLES = new Set(['sponsor', 'solver', 'reviewer', 'arbiter']);
const REQUIRED_GRANT_FIELDS = [
  'id',
  'holderId',
  'holderRole',
  'artifactId',
  'artifactClass',
  'scope',
  'expiresAt',
  'ndaAcceptedAt',
  'prequalificationStatus',
  'lastAccessedAt'
];

function normalizeDate(value, fallback) {
  const date = value ? new Date(value) : new Date(fallback);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function hoursUntil(expiresAt, now) {
  return Math.round(((expiresAt.getTime() - now.getTime()) / HOUR) * 10) / 10;
}

function buildAuditEvent(type, grant, details = {}) {
  return {
    type,
    grantId: grant.id,
    holderId: grant.holderId,
    holderRole: grant.holderRole,
    artifactId: grant.artifactId,
    artifactClass: grant.artifactClass,
    details
  };
}

function validateGrantShape(grant) {
  return REQUIRED_GRANT_FIELDS.filter((field) => {
    return grant[field] === undefined || grant[field] === null || grant[field] === '';
  });
}

function evaluateGrant(grant, context) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const auditEvents = [];
  const now = normalizeDate(context.now, DEFAULT_NOW);
  const expiresAt = normalizeDate(grant.expiresAt, context.now);
  const lastAccessedAt = normalizeDate(grant.lastAccessedAt, context.now);
  const missingFields = validateGrantShape(grant);

  if (missingFields.length > 0) {
    blockers.push(`missing required fields: ${missingFields.join(', ')}`);
    actions.push(`complete grant metadata for ${grant.id || 'unknown grant'}`);
  }

  if (!APPROVED_ROLES.has(grant.holderRole)) {
    blockers.push(`unapproved holder role: ${grant.holderRole}`);
    actions.push(`replace ${grant.holderId} with an approved role before opening the data room`);
  }

  if (grant.prequalificationStatus !== 'approved') {
    blockers.push(`prequalification is ${grant.prequalificationStatus}`);
    actions.push(`finish prequalification for ${grant.holderId}`);
    auditEvents.push(buildAuditEvent('prequalification_hold', grant, {
      status: grant.prequalificationStatus
    }));
  }

  if (!grant.ndaAcceptedAt) {
    blockers.push('NDA acceptance is missing');
    actions.push(`collect NDA acceptance before granting ${grant.holderId} access`);
    auditEvents.push(buildAuditEvent('nda_hold', grant));
  }

  if (!REQUIRED_ARTIFACT_CLASSES.has(grant.artifactClass)) {
    warnings.push(`artifact class ${grant.artifactClass} is outside standard scientific bounty classes`);
    actions.push(`confirm artifact classification for ${grant.artifactId}`);
  }

  if (expiresAt <= now) {
    blockers.push('grant is expired');
    actions.push(`revoke or renew expired grant ${grant.id}`);
    auditEvents.push(buildAuditEvent('revocation_required', grant, {
      reason: 'expired',
      expiredHoursAgo: Math.abs(hoursUntil(expiresAt, now))
    }));
  } else if (hoursUntil(expiresAt, now) <= context.expiryWarningHours) {
    warnings.push(`grant expires in ${hoursUntil(expiresAt, now)} hours`);
    actions.push(`notify ${grant.holderId} and sponsor owner before grant ${grant.id} expires`);
  }

  if (grant.scope === 'write' && grant.holderRole !== 'sponsor') {
    blockers.push('non-sponsor grant has write access');
    actions.push(`downgrade ${grant.id} to read-only until arbitration approves write access`);
    auditEvents.push(buildAuditEvent('least_privilege_violation', grant, {
      currentScope: grant.scope,
      requiredScope: 'read'
    }));
  }

  if (grant.scope === 'admin' && grant.holderRole !== 'sponsor') {
    blockers.push('admin access is limited to sponsor owners');
    actions.push(`remove admin access from ${grant.holderId}`);
    auditEvents.push(buildAuditEvent('admin_revocation_required', grant));
  }

  const idleHours = Math.round(((now.getTime() - lastAccessedAt.getTime()) / HOUR) * 10) / 10;
  if (idleHours >= context.staleAccessHours) {
    warnings.push(`grant unused for ${idleHours} hours`);
    actions.push(`rotate or revoke stale access grant ${grant.id}`);
    auditEvents.push(buildAuditEvent('stale_access_review', grant, {
      idleHours
    }));
  }

  return {
    grantId: grant.id,
    holderId: grant.holderId,
    holderRole: grant.holderRole,
    artifactId: grant.artifactId,
    artifactClass: grant.artifactClass,
    scope: grant.scope,
    expiresInHours: hoursUntil(expiresAt, now),
    blockers,
    warnings,
    actions,
    auditEvents
  };
}

function summarizeAccessReviews(reviews) {
  const blockers = reviews.flatMap((review) => review.blockers.map((item) => ({
    grantId: review.grantId,
    message: item
  })));
  const warnings = reviews.flatMap((review) => review.warnings.map((item) => ({
    grantId: review.grantId,
    message: item
  })));
  const actions = reviews.flatMap((review) => review.actions.map((item) => ({
    grantId: review.grantId,
    action: item
  })));
  const auditEvents = reviews.flatMap((review) => review.auditEvents);

  return {
    status: blockers.length === 0 ? 'data_room_ready' : 'hold_data_room',
    grantCount: reviews.length,
    blockers,
    warnings,
    actions,
    auditEvents
  };
}

function evaluateDataRoomAccess(input, options = {}) {
  const context = {
    now: options.now || input.generatedAt || DEFAULT_NOW,
    expiryWarningHours: options.expiryWarningHours || 24,
    staleAccessHours: options.staleAccessHours || 72
  };
  const reviews = input.grants.map((grant) => evaluateGrant(grant, context));
  const summary = summarizeAccessReviews(reviews);

  return {
    challengeId: input.challengeId,
    challengeTitle: input.challengeTitle,
    generatedAt: context.now,
    status: summary.status,
    summary,
    reviews
  };
}

function toMarkdownReport(result) {
  const lines = [
    `# Sponsor Data-Room Access Guard Report`,
    '',
    `Challenge: ${result.challengeTitle} (${result.challengeId})`,
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Grants reviewed: ${result.summary.grantCount}`,
    `- Blockers: ${result.summary.blockers.length}`,
    `- Warnings: ${result.summary.warnings.length}`,
    `- Audit events: ${result.summary.auditEvents.length}`,
    ''
  ];

  if (result.summary.blockers.length > 0) {
    lines.push('## Blockers', '');
    for (const blocker of result.summary.blockers) {
      lines.push(`- ${blocker.grantId}: ${blocker.message}`);
    }
    lines.push('');
  }

  if (result.summary.warnings.length > 0) {
    lines.push('## Warnings', '');
    for (const warning of result.summary.warnings) {
      lines.push(`- ${warning.grantId}: ${warning.message}`);
    }
    lines.push('');
  }

  if (result.summary.actions.length > 0) {
    lines.push('## Sponsor Remediation Actions', '');
    for (const action of result.summary.actions) {
      lines.push(`- ${action.grantId}: ${action.action}`);
    }
    lines.push('');
  }

  lines.push('## Reviewer-Safe Grant Snapshot', '');
  for (const review of result.reviews) {
    lines.push(`- ${review.grantId}: ${review.holderRole} ${review.holderId} -> ${review.artifactClass}/${review.artifactId} (${review.scope}, expires in ${review.expiresInHours}h)`);
  }

  return `${lines.join('\n')}\n`;
}

function toSvgSummary(result) {
  const blockerCount = result.summary.blockers.length;
  const warningCount = result.summary.warnings.length;
  const color = blockerCount > 0 ? '#b91c1c' : '#15803d';
  const status = blockerCount > 0 ? 'HOLD' : 'READY';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="64" y="64" width="1152" height="592" rx="24" fill="#f8fafc"/>
  <text x="104" y="132" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#111827">Sponsor Data-Room Access Guard</text>
  <text x="104" y="184" font-family="Arial, sans-serif" font-size="24" fill="#475569">${escapeXml(result.challengeTitle)}</text>
  <rect x="104" y="236" width="240" height="96" rx="16" fill="${color}"/>
  <text x="132" y="296" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">${status}</text>
  <text x="104" y="396" font-family="Arial, sans-serif" font-size="28" fill="#111827">Grants reviewed: ${result.summary.grantCount}</text>
  <text x="104" y="450" font-family="Arial, sans-serif" font-size="28" fill="#111827">Blockers: ${blockerCount}</text>
  <text x="104" y="504" font-family="Arial, sans-serif" font-size="28" fill="#111827">Warnings: ${warningCount}</text>
  <text x="104" y="558" font-family="Arial, sans-serif" font-size="28" fill="#111827">Audit events: ${result.summary.auditEvents.length}</text>
  <text x="104" y="618" font-family="Arial, sans-serif" font-size="20" fill="#64748b">Synthetic-data-only local demo. No credentials, tokens, or private data.</text>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

module.exports = {
  evaluateDataRoomAccess,
  toMarkdownReport,
  toSvgSummary
};
