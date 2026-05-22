function list(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return clean(value).toLowerCase();
}

function hoursBetween(older, newer) {
  const olderTime = Date.parse(older);
  const newerTime = Date.parse(newer);
  if (!Number.isFinite(olderTime) || !Number.isFinite(newerTime)) {
    return Infinity;
  }
  return Math.floor((newerTime - olderTime) / 3600000);
}

function finding(type, severity, target, message) {
  return {type, severity, target, message};
}

function action(type, target, reason) {
  return {type, target, reason};
}

function compareField(input, findings, repairPlan, field, type, label) {
  const canonicalValue = normalize(input.canonical?.[field]);
  for (const replica of list(input.replicas)) {
    const replicaValue = normalize(replica[field]);
    if (canonicalValue && replicaValue && canonicalValue !== replicaValue) {
      findings.push(
        finding(
          type,
          'block',
          replica.id || 'unknown-replica',
          `${replica.id || 'Replica'} ${label} ${replica[field]} does not match canonical ${input.canonical[field]}.`
        )
      );
      repairPlan.push(
        action(
          `repair-${field}`,
          replica.id || 'unknown-replica',
          `Reconcile ${replica.id || 'replica'} ${label} against canonical manifest before exposing durable artifact actions.`
        )
      );
    }
  }
}

function validateReplicaFreshness(input, findings, repairPlan) {
  const maxLag = Number.isFinite(input.maxMirrorLagHours) ? input.maxMirrorLagHours : 168;
  for (const replica of list(input.replicas)) {
    const age = hoursBetween(replica.lastVerifiedAt, input.generatedAt);
    if (age > maxLag) {
      const severity = normalize(replica.tier) === 'mirror' ? 'review' : 'block';
      findings.push(
        finding(
          'replica-verification-stale',
          severity,
          replica.id || 'unknown-replica',
          `${replica.id || 'Replica'} was last verified ${age} hours ago, above the ${maxLag}-hour freshness threshold.`
        )
      );
      repairPlan.push(
        action(
          'refresh-replica-verification',
          replica.id || 'unknown-replica',
          `Refresh checksum and manifest verification for ${replica.id || 'replica'} before export or reproduce actions continue.`
        )
      );
    }
  }
}

function validateLandingPage(input, findings, repairPlan) {
  const landing = input.landingPage || {};
  const canonical = input.canonical || {};
  if (normalize(landing.dataciteDoi) !== normalize(canonical.dataciteDoi)) {
    findings.push(
      finding(
        'landing-page-datacite-mismatch',
        'block',
        'landing-page',
        `Landing page DataCite DOI ${landing.dataciteDoi || 'missing'} does not match canonical DOI ${canonical.dataciteDoi || 'missing'}.`
      )
    );
    repairPlan.push(
      action(
        'repair-landing-page-datacite',
        'landing-page',
        'Update landing page DataCite metadata before persistent links or exports are enabled.'
      )
    );
  }
  if (normalize(landing.schemaOrgUrl) !== normalize(canonical.schemaOrgUrl)) {
    findings.push(
      finding(
        'landing-page-schemaorg-mismatch',
        'block',
        'landing-page',
        `Landing page schema.org URL ${landing.schemaOrgUrl || 'missing'} does not match canonical URL ${canonical.schemaOrgUrl || 'missing'}.`
      )
    );
    repairPlan.push(
      action(
        'repair-landing-page-schemaorg',
        'landing-page',
        'Update schema.org URL metadata before discovery crawlers see this artifact.'
      )
    );
  }
  if (normalize(landing.accessPolicy) !== normalize(canonical.accessPolicy)) {
    findings.push(
      finding(
        'landing-page-access-policy-mismatch',
        'block',
        'landing-page',
        `Landing page access policy ${landing.accessPolicy || 'missing'} does not match canonical policy ${canonical.accessPolicy || 'missing'}.`
      )
    );
    repairPlan.push(
      action(
        'repair-landing-page-access-policy',
        'landing-page',
        'Align landing page access policy with canonical storage policy before public previews are trusted.'
      )
    );
  }
}

function summarize(findings) {
  const blockingFindingCount = findings.filter((item) => item.severity === 'block').length;
  const reviewFindingCount = findings.filter((item) => item.severity !== 'block').length;
  return {
    findingCount: findings.length,
    blockingFindingCount,
    reviewFindingCount,
  };
}

function decideVisibleActions(input, decision, findings) {
  const requested = list(input.actionsRequested);
  if (decision === 'publish-artifact') {
    return {visibleActions: requested, gatedActions: []};
  }
  if (decision === 'hold-artifact') {
    return {visibleActions: [], gatedActions: requested};
  }
  const hasOnlyFreshnessReview = findings.every((item) => item.type === 'replica-verification-stale' && item.severity === 'review');
  if (hasOnlyFreshnessReview) {
    return {
      visibleActions: requested.filter((item) => item === 'enable-preview'),
      gatedActions: requested.filter((item) => item !== 'enable-preview'),
    };
  }
  return {
    visibleActions: [],
    gatedActions: requested,
  };
}

function evaluateArtifactReplicaConsistency(input = {}) {
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  const normalizedInput = {...input, generatedAt};
  const findings = [];
  const repairPlan = [];

  compareField(normalizedInput, findings, repairPlan, 'checksum', 'replica-checksum-mismatch', 'checksum');
  compareField(normalizedInput, findings, repairPlan, 'manifestVersion', 'manifest-version-mismatch', 'manifest version');
  compareField(normalizedInput, findings, repairPlan, 'accessPolicy', 'access-policy-mismatch', 'access policy');
  validateReplicaFreshness(normalizedInput, findings, repairPlan);
  validateLandingPage(normalizedInput, findings, repairPlan);

  const summary = summarize(findings);
  const decision = summary.blockingFindingCount > 0
    ? 'hold-artifact'
    : summary.reviewFindingCount > 0
      ? 'repair-review'
      : 'publish-artifact';
  const {visibleActions, gatedActions} = decideVisibleActions(normalizedInput, decision, findings);

  return {
    generatedAt,
    artifactId: input.artifactId || 'unknown-artifact',
    artifactType: input.artifactType || 'unknown-type',
    decision,
    summary,
    findings,
    repairPlan,
    visibleActions,
    gatedActions,
    publicationPacket: {
      artifactId: input.artifactId || 'unknown-artifact',
      artifactType: input.artifactType || 'unknown-type',
      decision,
      dataciteDoi: input.canonical?.dataciteDoi || '',
      schemaOrgUrl: input.canonical?.schemaOrgUrl || '',
      replicaCount: list(input.replicas).length,
      gatedActions,
      visibleActions,
    },
  };
}

function buildReplicaConsistencyPacket(result) {
  const lines = [
    `# Artifact Replica Consistency Guard: ${result.artifactId}`,
    '',
    `Artifact type: ${result.artifactType}`,
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    `Replicas: ${result.publicationPacket.replicaCount}`,
    '',
    '## Visible Actions',
  ];

  if (result.visibleActions.length === 0) {
    lines.push('- None');
  } else {
    for (const item of result.visibleActions) {
      lines.push(`- ${item}`);
    }
  }

  lines.push('', '## Gated Actions');
  if (result.gatedActions.length === 0) {
    lines.push('- None');
  } else {
    for (const item of result.gatedActions) {
      lines.push(`- ${item}`);
    }
  }

  lines.push('', '## Findings');
  if (result.findings.length === 0) {
    lines.push('- None');
  } else {
    for (const item of result.findings) {
      lines.push(`- ${item.type}: ${item.target} - ${item.message}`);
    }
  }

  lines.push('', '## Repair Plan');
  if (result.repairPlan.length === 0) {
    lines.push('- No repair action required');
  } else {
    for (const item of result.repairPlan) {
      lines.push(`- ${item.type}: ${item.target} - ${item.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateArtifactReplicaConsistency,
  buildReplicaConsistencyPacket,
};
