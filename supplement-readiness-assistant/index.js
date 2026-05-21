const crypto = require('crypto');

const DEFAULT_POLICY = {
  maxChecksumAgeDays: 21,
  requiredArtifactKinds: ['dataset', 'code', 'notebook', 'protocol'],
  licenseRequiredKinds: ['dataset', 'code', 'notebook'],
  rerunRequiredClaimTypes: ['statistical', 'computational', 'figure'],
  publicAccessModes: ['public', 'open'],
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function indexById(items) {
  const out = new Map();
  for (const item of asArray(items)) {
    if (item && item.id) {
      out.set(item.id, item);
    }
  }
  return out;
}

function hasPublicAccess(artifact, policy) {
  return policy.publicAccessModes.includes(String(artifact.access || '').toLowerCase());
}

function evaluateArtifact(artifact, claimsById, policy) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const linkedClaims = asArray(artifact.linkedClaims);
  const knownLinkedClaims = linkedClaims.filter((claimId) => claimsById.has(claimId));

  if (!artifact.path) {
    blockers.push('missing_path');
    actions.push('add_artifact_path');
  }

  if (!artifact.checksum) {
    blockers.push('missing_checksum');
    actions.push('add_checksum');
  } else if (artifact.expectedChecksum && artifact.checksum !== artifact.expectedChecksum) {
    blockers.push('checksum_mismatch');
    actions.push('regenerate_or_correct_checksum');
  }

  if (Number.isFinite(artifact.checksumAgeDays) && artifact.checksumAgeDays > policy.maxChecksumAgeDays) {
    warnings.push('stale_checksum');
    actions.push('refresh_checksum');
  }

  if (policy.licenseRequiredKinds.includes(artifact.kind) && !artifact.license) {
    blockers.push('missing_license');
    actions.push('add_license_metadata');
  }

  if (artifact.containsHumanData && hasPublicAccess(artifact, policy) && !artifact.deidentified) {
    blockers.push('human_data_not_deidentified');
    actions.push('redact_or_restrict_human_data');
  }

  if (artifact.embargoed && hasPublicAccess(artifact, policy)) {
    blockers.push('embargoed_artifact_public');
    actions.push('move_embargoed_artifact_to_restricted_access');
  }

  if (artifact.kind === 'notebook' && artifact.rerunnable === false) {
    blockers.push('notebook_not_rerunnable');
    actions.push('provide_rerun_environment');
  }

  if (artifact.kind === 'protocol' && !artifact.version) {
    warnings.push('protocol_version_missing');
    actions.push('add_protocol_version');
  }

  if (linkedClaims.length === 0) {
    warnings.push('orphan_artifact');
    actions.push('link_artifact_to_claim');
  } else if (knownLinkedClaims.length !== linkedClaims.length) {
    warnings.push('unknown_claim_link');
    actions.push('repair_claim_links');
  }

  return {
    id: artifact.id,
    label: artifact.label,
    kind: artifact.kind,
    status: blockers.length ? 'block' : warnings.length ? 'warn' : 'pass',
    linkedClaims: knownLinkedClaims,
    blockers,
    warnings,
    actions: unique(actions),
  };
}

function evaluateClaim(claim, artifactsById, policy) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const requiredArtifacts = asArray(claim.requiredArtifacts);
  const linkedArtifacts = requiredArtifacts
    .map((artifactId) => artifactsById.get(artifactId))
    .filter(Boolean);
  const missingArtifacts = requiredArtifacts.filter((artifactId) => !artifactsById.has(artifactId));

  if (requiredArtifacts.length === 0) {
    warnings.push('claim_has_no_required_supplements');
    actions.push('declare_required_supplements_or_mark_textual_claim');
  }

  if (missingArtifacts.length > 0) {
    blockers.push('missing_required_artifact');
    actions.push('attach_missing_required_artifact');
  }

  if (asArray(claim.supplementLinks).length === 0) {
    blockers.push('missing_supplement_link');
    actions.push('add_claim_to_supplement_link');
  }

  const needsRerun = policy.rerunRequiredClaimTypes.includes(claim.type);
  if (needsRerun) {
    const hasRerunnableNotebook = linkedArtifacts.some(
      (artifact) => artifact.kind === 'notebook' && artifact.rerunnable === true,
    );
    const hasCode = linkedArtifacts.some((artifact) => artifact.kind === 'code');
    const hasDataset = linkedArtifacts.some((artifact) => artifact.kind === 'dataset');
    if (!hasRerunnableNotebook || !hasCode || !hasDataset) {
      blockers.push('rerun_prerequisites_incomplete');
      actions.push('connect_dataset_code_and_rerunnable_notebook');
    }
  }

  if (asArray(claim.figureRefs).length > 0) {
    const hasAppendixSupport = linkedArtifacts.some((artifact) =>
      asArray(artifact.appendixRefs).some((ref) => asArray(claim.figureRefs).includes(ref)),
    );
    if (!hasAppendixSupport) {
      warnings.push('figure_appendix_support_not_linked');
      actions.push('link_figure_or_table_appendix_support');
    }
  }

  return {
    id: claim.id,
    text: claim.text,
    type: claim.type,
    status: blockers.length ? 'block' : warnings.length ? 'warn' : 'pass',
    requiredArtifacts,
    missingArtifacts,
    linkedArtifacts: linkedArtifacts.map((artifact) => artifact.id),
    blockers,
    warnings,
    actions: unique(actions),
  };
}

function summarizeCoverage(claimResults, artifactResults, policy) {
  const coveredClaims = claimResults.filter((claim) => claim.status !== 'block').length;
  const presentKinds = new Set(artifactResults.map((artifact) => artifact.kind));
  const missingKinds = policy.requiredArtifactKinds.filter((kind) => !presentKinds.has(kind));

  return {
    claimsTotal: claimResults.length,
    claimsReady: coveredClaims,
    claimsBlocked: claimResults.filter((claim) => claim.status === 'block').length,
    artifactsTotal: artifactResults.length,
    artifactsPassing: artifactResults.filter((artifact) => artifact.status === 'pass').length,
    missingRequiredKinds: missingKinds,
  };
}

function evaluateSupplementReadiness(input) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const manuscript = input.manuscript || {};
  const supplementPackage = input.supplementPackage || {};
  const claims = asArray(manuscript.claims);
  const artifacts = asArray(supplementPackage.artifacts);
  const claimsById = indexById(claims);
  const artifactsById = indexById(artifacts);

  const claimResults = claims.map((claim) => evaluateClaim(claim, artifactsById, policy));
  const artifactResults = artifacts.map((artifact) => evaluateArtifact(artifact, claimsById, policy));
  const coverage = summarizeCoverage(claimResults, artifactResults, policy);
  const globalBlockers = [];
  const globalWarnings = [];
  const reviewerActions = [];

  for (const missingKind of coverage.missingRequiredKinds) {
    globalBlockers.push(`missing_${missingKind}_artifact_kind`);
    reviewerActions.push(`add_${missingKind}_artifact`);
  }

  for (const result of [...claimResults, ...artifactResults]) {
    for (const blocker of result.blockers) {
      globalBlockers.push(`${result.id}_${blocker}`);
    }
    for (const warning of result.warnings) {
      globalWarnings.push(`${result.id}_${warning}`);
    }
    for (const action of result.actions) {
      reviewerActions.push(`${result.id}_${action}`);
    }
  }

  const possiblePenaltyUnits = Math.max(claimResults.length + artifactResults.length + coverage.missingRequiredKinds.length, 1);
  const penalty = globalBlockers.length * 12 + globalWarnings.length * 4;
  const readinessScore = Math.max(0, Math.round(100 - penalty / possiblePenaltyUnits));
  const status = globalBlockers.length ? 'hold' : globalWarnings.length ? 'review_with_warnings' : 'ready';
  const packet = {
    manuscript: {
      id: manuscript.id,
      title: manuscript.title,
      domain: manuscript.domain,
    },
    supplementPackage: {
      id: supplementPackage.id,
      version: supplementPackage.version,
      accessMode: supplementPackage.accessMode,
    },
    status,
    readinessScore,
    coverage,
    blockers: unique(globalBlockers),
    warnings: unique(globalWarnings),
    reviewerActions: unique(reviewerActions),
    claimResults,
    artifactResults,
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  DEFAULT_POLICY,
  digest,
  evaluateSupplementReadiness,
};
