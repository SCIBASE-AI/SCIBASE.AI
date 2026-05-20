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

function addHold(holds, code, owner, evidence, requiredAction) {
  holds.push({
    code,
    severity: 'blocker',
    owner,
    evidence,
    requiredAction,
  });
}

function addWarning(warnings, code, owner, evidence, requiredAction) {
  warnings.push({
    code,
    severity: 'warning',
    owner,
    evidence,
    requiredAction,
  });
}

function evaluateCollaborator(collaborator, repository, options) {
  const holds = [];
  const warnings = [];
  const decisions = new Set();
  const asOf = options.asOf;

  const isExternalReviewer = collaborator.affiliation === 'external' && collaborator.role === 'reviewer';
  if (isExternalReviewer && collaborator.access.expiresAt && toTime(collaborator.access.expiresAt) < toTime(asOf)) {
    addHold(
      holds,
      'external_reviewer_expired',
      collaborator.userId,
      `${collaborator.name} review access expired on ${collaborator.access.expiresAt}`,
      'Revoke reviewer access or issue a fresh time-boxed invite before release.',
    );
    decisions.add('revoke_before_release');
  }

  if (
    collaborator.access.canDownloadRestrictedData &&
    collaborator.access.dataUseApprovalExpiresAt &&
    toTime(collaborator.access.dataUseApprovalExpiresAt) < toTime(asOf)
  ) {
    addHold(
      holds,
      'restricted_dataset_approval_expired',
      collaborator.userId,
      `${collaborator.name} has restricted-data download access with an expired DUA approval.`,
      'Remove restricted-data access until the data-use approval is renewed.',
    );
    decisions.add('revoke_before_release');
  }

  const privileged = ['owner', 'admin', 'maintainer'].includes(collaborator.role);
  if (privileged && !collaborator.access.releaseApproved) {
    addHold(
      holds,
      'privileged_role_without_release_scope',
      collaborator.userId,
      `${collaborator.name} is ${collaborator.role} but is not approved for ${options.releaseTag}.`,
      'Downgrade the role or record release-scope approval from a repository owner.',
    );
    decisions.add('downgrade_before_release');
  }

  if (
    collaborator.access.expiresAt &&
    toTime(collaborator.access.expiresAt) >= toTime(asOf) &&
    daysUntil(collaborator.access.expiresAt, asOf) <= repository.policy.nearExpiryWarningDays
  ) {
    addWarning(
      warnings,
      'temporary_access_near_expiry',
      collaborator.userId,
      `${collaborator.name} access expires in ${daysUntil(collaborator.access.expiresAt, asOf)} days.`,
      'Confirm whether temporary access should survive the release review window.',
    );
  }

  return {
    holds,
    warnings,
    accessDecision: {
      userId: collaborator.userId,
      name: collaborator.name,
      role: collaborator.role,
      scope: collaborator.access.scope,
      releaseApproved: Boolean(collaborator.access.releaseApproved),
      decision: decisions.has('revoke_before_release')
        ? 'revoke_before_release'
        : decisions.has('downgrade_before_release')
          ? 'downgrade_before_release'
          : 'keep',
    },
  };
}

function evaluateRepositoryAccessReview(repository, options = {}) {
  const reviewOptions = {
    asOf: options.asOf || new Date().toISOString(),
    releaseTag: options.releaseTag || repository.release.tag,
  };
  const holds = [];
  const warnings = [];
  const accessMatrix = [];

  for (const collaborator of repository.collaborators) {
    const collaboratorReview = evaluateCollaborator(collaborator, repository, reviewOptions);
    holds.push(...collaboratorReview.holds);
    warnings.push(...collaboratorReview.warnings);
    accessMatrix.push(collaboratorReview.accessDecision);
  }

  const exposedLinks = repository.artifacts.filter((artifact) => artifact.secretLink);
  if (exposedLinks.length > 0) {
    addHold(
      holds,
      'secret_link_exposure',
      'security-review',
      `${exposedLinks.length} artifact link(s) expose secret-bearing URLs in the release packet.`,
      'Replace secret links with scoped repository object grants before export.',
    );
  }

  const licenseMismatch = repository.artifacts.find(
    (artifact) => artifact.license === 'restricted-dua' && repository.release.visibility === 'public',
  );
  if (licenseMismatch) {
    addHold(
      holds,
      'license_access_mismatch',
      licenseMismatch.owner,
      `${licenseMismatch.path} is restricted-dua but ${repository.release.tag} targets public export.`,
      'Block public export or replace the artifact with a license-compatible derivative.',
    );
  }

  const sortedHolds = holds.sort((left, right) => left.code.localeCompare(right.code));
  const sortedWarnings = warnings.sort((left, right) => left.code.localeCompare(right.code));

  return {
    repositoryId: repository.repositoryId,
    releaseTag: reviewOptions.releaseTag,
    releaseStatus: sortedHolds.length > 0 ? 'hold' : 'ready',
    summary: {
      collaboratorsReviewed: repository.collaborators.length,
      artifactsReviewed: repository.artifacts.length,
      blockingHolds: sortedHolds.length,
      warningCount: sortedWarnings.length,
    },
    holds: sortedHolds,
    warnings: sortedWarnings,
    accessMatrix,
  };
}

function buildReleaseHoldPacket(repository, options = {}) {
  const review = evaluateRepositoryAccessReview(repository, options);
  const packet = {
    packetType: 'repository-access-review-gate',
    repositoryId: review.repositoryId,
    releaseTag: review.releaseTag,
    releaseStatus: review.releaseStatus,
    generatedAt: options.asOf || new Date().toISOString(),
    releaseHolds: review.holds,
    reviewerChecklist: review.holds.map((hold) => ({
      owner: hold.owner,
      requiredAction: hold.requiredAction,
      evidence: hold.evidence,
    })),
    accessMatrix: review.accessMatrix,
    warnings: review.warnings,
  };
  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  evaluateRepositoryAccessReview,
  buildReleaseHoldPacket,
  stableStringify,
  digest,
};
