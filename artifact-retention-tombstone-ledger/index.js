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

function addHold(holds, artifact, code, owner, evidence, requiredAction) {
  holds.push({
    artifactId: artifact.artifactId,
    code,
    owner,
    severity: 'blocker',
    evidence,
    requiredAction,
  });
}

function tombstoneMetadataFor(artifact) {
  return {
    doi: artifact.doi || null,
    title: artifact.title,
    artifactType: artifact.artifactType,
    sha256: artifact.sha256 || null,
    license: artifact.license,
    replacementUri: artifact.replacementUri || null,
    disposalReason: artifact.disposalRequest.reason,
  };
}

function evaluateArtifact(artifact, options) {
  const holds = [];

  if (artifact.policyHolds.length > 0) {
    addHold(
      holds,
      artifact,
      'active_policy_hold',
      artifact.owner,
      `${artifact.artifactId} has active hold(s): ${artifact.policyHolds.join(', ')}.`,
      'Clear or document the legal, IRB, funder, or citation hold before disposal.',
    );
  }

  if (toTime(artifact.retentionUntil) > toTime(options.asOf)) {
    addHold(
      holds,
      artifact,
      'retention_window_not_elapsed',
      artifact.owner,
      `${artifact.artifactId} must be retained until ${artifact.retentionUntil}.`,
      'Wait until the retention window elapses or obtain an explicit retention override.',
    );
  }

  if (!artifact.sha256) {
    addHold(
      holds,
      artifact,
      'checksum_manifest_missing',
      artifact.owner,
      `${artifact.artifactId} is missing a checksum manifest.`,
      'Generate and preserve SHA-256 evidence before any deletion or tombstone export.',
    );
  }

  const hasCitationDependency = artifact.doi || artifact.citationCount > 0;
  if (hasCitationDependency && !artifact.tombstoneMetadataComplete) {
    addHold(
      holds,
      artifact,
      'citation_tombstone_required',
      artifact.owner,
      `${artifact.artifactId} is cited or DOI-backed but lacks complete tombstone metadata.`,
      'Record DOI, title, type, checksum, license, and replacement URI before disposal.',
    );
  }

  if (artifact.disposalRequest.mode === 'hard_delete' && hasCitationDependency) {
    addHold(
      holds,
      artifact,
      'destructive_delete_not_allowed',
      artifact.owner,
      `${artifact.artifactId} requested hard delete despite citation dependencies.`,
      'Use a tombstone-preserving disposal mode for cited scientific artifacts.',
    );
  }

  let decision = 'retain';
  if (holds.length > 0) {
    decision = holds.some((hold) => hold.code === 'citation_tombstone_required') && holds.length === 1
      ? 'tombstone_required'
      : 'hold';
  } else if (artifact.disposalRequest.requested) {
    decision = artifact.doi || artifact.citationCount > 0 ? 'dispose_with_tombstone' : 'dispose';
  }

  return {
    decision: {
      artifactId: artifact.artifactId,
      decision,
      tombstoneRequired: Boolean(artifact.doi || artifact.citationCount > 0),
      retentionUntil: artifact.retentionUntil,
      disposalMode: artifact.disposalRequest.mode,
    },
    holds,
    tombstonePlan: {
      artifactId: artifact.artifactId,
      decision,
      requiredMetadata: tombstoneMetadataFor(artifact),
      preserveChecksum: Boolean(artifact.sha256),
      publicLandingPage: Boolean(artifact.doi || artifact.citationCount > 0),
    },
  };
}

function evaluateArtifactRetention(project, options = {}) {
  const evaluationOptions = {
    asOf: options.asOf || new Date().toISOString(),
  };
  const decisions = [];
  const holds = [];
  const tombstonePlan = [];

  for (const artifact of project.artifacts) {
    const result = evaluateArtifact(artifact, evaluationOptions);
    decisions.push(result.decision);
    holds.push(...result.holds);
    tombstonePlan.push(result.tombstonePlan);
  }

  const sortedHolds = holds.sort((left, right) => left.code.localeCompare(right.code));

  return {
    projectId: project.projectId,
    overallStatus: sortedHolds.length > 0 ? 'hold' : 'ready',
    summary: {
      artifactsReviewed: project.artifacts.length,
      blockingHolds: sortedHolds.length,
      disposalReady: decisions.filter((decision) => decision.decision.startsWith('dispose')).length,
      tombstonesRequired: decisions.filter((decision) => decision.tombstoneRequired).length,
    },
    decisions,
    holds: sortedHolds,
    tombstonePlan,
  };
}

function buildTombstoneLedgerPacket(project, options = {}) {
  const review = evaluateArtifactRetention(project, options);
  const packet = {
    packetType: 'artifact-retention-tombstone-ledger',
    projectId: review.projectId,
    generatedAt: options.asOf || new Date().toISOString(),
    overallStatus: review.overallStatus,
    decisions: review.decisions,
    holds: review.holds,
    tombstonePlan: review.tombstonePlan,
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  evaluateArtifactRetention,
  buildTombstoneLedgerPacket,
  stableStringify,
  digest,
};
