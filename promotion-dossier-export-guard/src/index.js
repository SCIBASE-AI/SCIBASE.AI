'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  evidenceFreshnessDays: 365,
  restrictedReviewRequiresAuthorConsent: true
});

const SEVERITY_RANK = Object.freeze({
  RELEASE_DOSSIER: 0,
  REVIEW_BEFORE_EXPORT: 1,
  HOLD_EXPORT: 2
});

const BLIND_MODES = new Set(['anonymous', 'blind', 'double-blind']);
const RESTRICTED_REVIEW_MODES = new Set(['semi-private', 'anonymous', 'blind', 'double-blind']);

function parseDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date for ${fieldName}: ${value}`);
  return date;
}

function ageInDays(date, asOf) {
  return Math.floor((asOf.getTime() - date.getTime()) / DAY_MS);
}

function classify(current, incoming) {
  return SEVERITY_RANK[incoming] > SEVERITY_RANK[current] ? incoming : current;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function evaluateDossier(dossier, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
  const asOf = parseDate(options.asOf, 'asOf') || new Date();
  const consent = dossier.consent || {};
  const reviews = dossier.reviews || [];
  const credits = dossier.credits || [];
  const badges = dossier.badges || [];
  const reputation = dossier.reputation || {};
  let decision = 'RELEASE_DOSSIER';
  const reasons = [];
  const actions = [];

  function add(severity, code, message, action) {
    decision = classify(decision, severity);
    reasons.push({ severity, code, message });
    if (action) actions.push(action);
  }

  if (consent.optOut) {
    add(
      'HOLD_EXPORT',
      'CONTRIBUTOR_OPT_OUT',
      'Researcher has opted out of institution-facing dossier export.',
      'Remove this dossier from the export batch or collect updated consent.'
    );
  }

  if (!consent.exportConsentAt) {
    add(
      'HOLD_EXPORT',
      'EXPORT_CONSENT_MISSING',
      'No contributor export consent timestamp is attached.',
      'Collect export consent before sharing the dossier.'
    );
  }

  for (const review of reviews) {
    if (BLIND_MODES.has(review.mode) && (review.reviewerName || review.redacted !== true)) {
      add(
        'HOLD_EXPORT',
        'BLIND_REVIEW_IDENTITY_LEAK',
        `Review ${review.id} is ${review.mode} but reviewer identity is not safely redacted.`,
        'Redact reviewer identity and regenerate the dossier.'
      );
    }

    if (
      policy.restrictedReviewRequiresAuthorConsent &&
      RESTRICTED_REVIEW_MODES.has(review.mode) &&
      !review.authorConsent
    ) {
      add(
        'HOLD_EXPORT',
        'RESTRICTED_REVIEW_EXPORT_NOT_AUTHORIZED',
        `Review ${review.id} is ${review.mode} and lacks author consent for export.`,
        'Exclude the restricted review or attach author export consent.'
      );
    }

    if (!review.evidenceId) {
      add(
        'REVIEW_BEFORE_EXPORT',
        'REVIEW_EVIDENCE_MISSING',
        `Review ${review.id} lacks evidence linkage.`,
        'Attach review evidence before export.'
      );
    }
  }

  for (const credit of credits) {
    if (!credit.evidenceId) {
      add(
        'REVIEW_BEFORE_EXPORT',
        'CREDIT_EVIDENCE_MISSING',
        `CRediT role "${credit.role}" lacks an evidence id.`,
        'Attach contribution evidence before using this credit in a dossier.'
      );
    }
    if (!credit.timestamp) {
      add(
        'REVIEW_BEFORE_EXPORT',
        'CREDIT_TIMESTAMP_MISSING',
        `CRediT role "${credit.role}" lacks a timestamp.`,
        'Add timestamped contribution evidence.'
      );
    }
  }

  for (const badge of badges) {
    const grantedAt = parseDate(badge.grantedAt, `badge.${badge.id}.grantedAt`);
    if (grantedAt && ageInDays(grantedAt, asOf) > policy.evidenceFreshnessDays) {
      add(
        'REVIEW_BEFORE_EXPORT',
        'BADGE_EVIDENCE_STALE',
        `Badge ${badge.id} evidence is ${ageInDays(grantedAt, asOf)} days old.`,
        'Refresh badge evidence or annotate the dossier with stale-evidence status.'
      );
    }
    if (!badge.evidenceId) {
      add(
        'REVIEW_BEFORE_EXPORT',
        'BADGE_EVIDENCE_MISSING',
        `Badge ${badge.id} lacks evidence linkage.`,
        'Attach badge evidence before export.'
      );
    }
  }

  if (Number(reputation.delta || 0) !== 0 && (!reputation.sourceEventIds || reputation.sourceEventIds.length === 0)) {
    add(
      'REVIEW_BEFORE_EXPORT',
      'REPUTATION_DELTA_SOURCE_MISSING',
      'Reputation delta is present without source event ids.',
      'Attach source reputation events before export.'
    );
  }

  if ((dossier.conflictNotes || []).length > 0) {
    add(
      'REVIEW_BEFORE_EXPORT',
      'CONFLICT_NOTES_REQUIRE_REDACTION',
      'Conflict notes are present and must be redacted or summarized before export.',
      'Replace internal conflict notes with a reviewer-safe export summary.'
    );
  }

  const sortedReasons = reasons.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.code.localeCompare(b.code)
  );

  return {
    dossierId: dossier.id,
    researcher: dossier.researcher,
    purpose: dossier.purpose,
    recipient: dossier.recipient,
    decision,
    exportSignals: {
      reviewCount: reviews.length,
      creditCount: credits.length,
      badgeCount: badges.length,
      blindReviewCount: reviews.filter((review) => BLIND_MODES.has(review.mode)).length,
      restrictedReviewCount: reviews.filter((review) => RESTRICTED_REVIEW_MODES.has(review.mode)).length
    },
    evidence: {
      exportConsentAt: consent.exportConsentAt || null,
      optOut: Boolean(consent.optOut),
      reputationSourceEventIds: reputation.sourceEventIds || []
    },
    reasons: sortedReasons,
    actions: unique(actions),
    riskScore: sortedReasons.reduce((total, reason) => total + SEVERITY_RANK[reason.severity], 0)
  };
}

function evaluateBatch(packet, options = {}) {
  const asOf = options.asOf || packet.asOf;
  const policy = { ...DEFAULT_POLICY, ...(packet.policy || {}), ...(options.policy || {}) };
  const results = (packet.dossiers || []).map((dossier) => evaluateDossier(dossier, { asOf, policy }));
  return {
    asOf,
    policy,
    summary: summarizeResults(results),
    results
  };
}

function summarizeResults(results) {
  const summary = {
    totalDossiers: results.length,
    release: 0,
    review: 0,
    hold: 0,
    heldDossierIds: [],
    reviewDossierIds: [],
    topRisks: []
  };

  for (const result of results) {
    if (result.decision === 'RELEASE_DOSSIER') summary.release += 1;
    if (result.decision === 'REVIEW_BEFORE_EXPORT') {
      summary.review += 1;
      summary.reviewDossierIds.push(result.dossierId);
    }
    if (result.decision === 'HOLD_EXPORT') {
      summary.hold += 1;
      summary.heldDossierIds.push(result.dossierId);
    }
  }

  summary.topRisks = results
    .flatMap((result) =>
      result.reasons.map((reason) => ({
        dossierId: result.dossierId,
        severity: reason.severity,
        code: reason.code
      }))
    )
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, 8);

  return summary;
}

function buildMarkdownReport(batch) {
  const lines = [
    '# Promotion Dossier Export Report',
    '',
    `As of: ${batch.asOf}`,
    '',
    '## Summary',
    '',
    `- Total dossiers: ${batch.summary.totalDossiers}`,
    `- Release: ${batch.summary.release}`,
    `- Review: ${batch.summary.review}`,
    `- Hold: ${batch.summary.hold}`,
    '',
    '## Dossier Decisions',
    '',
    '| Researcher | Purpose | Recipient | Decision | Primary reason |',
    '| --- | --- | --- | --- | --- |'
  ];

  for (const result of batch.results) {
    const primary = result.reasons[0]
      ? `${result.reasons[0].code}: ${result.reasons[0].message}`
      : 'All export checks passed';
    lines.push(
      `| ${result.researcher} | ${result.purpose} | ${result.recipient} | ${result.decision} | ${primary} |`
    );
  }

  lines.push('', '## Remediation Actions', '');
  for (const result of batch.results) {
    lines.push(`### ${result.researcher}`);
    if (result.actions.length === 0) {
      lines.push('- Release dossier to the configured institution-facing recipient.');
    } else {
      for (const action of result.actions) lines.push(`- ${action}`);
    }
    lines.push('');
  }

  while (lines[lines.length - 1] === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

function buildSvgSummary(batch) {
  const width = 860;
  const height = 330;
  const releaseWidth = batch.summary.release * 110;
  const reviewWidth = batch.summary.review * 110;
  const holdWidth = batch.summary.hold * 110;
  const escape = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const rows = batch.results
    .map((result, index) => {
      const y = 176 + index * 30;
      const color =
        result.decision === 'HOLD_EXPORT'
          ? '#c2410c'
          : result.decision === 'REVIEW_BEFORE_EXPORT'
            ? '#a16207'
            : '#15803d';
      return `<text x="42" y="${y}" font-size="14" fill="#111827">${escape(result.researcher)}</text><text x="520" y="${y}" font-size="14" fill="${color}" font-weight="700">${result.decision}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Promotion dossier export guard summary</title>
  <desc id="desc">Release, review, and hold counts for synthetic institution-facing reputation dossier exports.</desc>
  <rect width="860" height="330" fill="#f8fafc"/>
  <text x="40" y="48" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#111827">Promotion Dossier Export Guard</text>
  <text x="40" y="78" font-size="15" font-family="Arial, sans-serif" fill="#475569">Synthetic reviewer packet for Community &amp; Reputation issue #15</text>
  <rect x="40" y="108" width="${releaseWidth}" height="28" rx="4" fill="#16a34a"/>
  <rect x="${40 + releaseWidth}" y="108" width="${reviewWidth}" height="28" rx="4" fill="#ca8a04"/>
  <rect x="${40 + releaseWidth + reviewWidth}" y="108" width="${holdWidth}" height="28" rx="4" fill="#ea580c"/>
  <text x="40" y="156" font-size="13" font-family="Arial, sans-serif" fill="#111827">Release: ${batch.summary.release} | Review: ${batch.summary.review} | Hold: ${batch.summary.hold}</text>
  ${rows}
</svg>
`;
}

module.exports = {
  DEFAULT_POLICY,
  buildMarkdownReport,
  buildSvgSummary,
  evaluateBatch,
  evaluateDossier,
  summarizeResults
};
