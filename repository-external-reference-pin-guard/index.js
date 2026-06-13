const crypto = require('crypto');

const DEFAULT_POLICY = {
  maxReferenceAgeDays: 180
};

const CHECKSUM_HEX_LENGTHS = {
  sha256: 64,
  sha384: 96,
  sha512: 128
};

function assessExternalReferences(repository) {
  const normalizedRepository = normalizeRepository(repository);
  const policy = { ...DEFAULT_POLICY, ...(normalizedRepository.policy || {}) };
  const references = normalizeReferenceEntries(normalizedRepository.references);
  const findings = [
    ...assessRepositoryPacket(normalizedRepository),
    ...references.flatMap((reference) => assessReference(reference, normalizedRepository.assessedAt, policy))
  ]
    .sort(compareFindings);

  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  const packet = {
    repositoryId: normalizedRepository.repositoryId,
    status: chooseStatus(blockerCount, warningCount),
    releaseLanes: chooseReleaseLanes(blockerCount, warningCount),
    findings,
    actions: buildActions(normalizedRepository, findings),
    referenceSignals: buildSignals(findings),
    referenceSummary: summarizeReferences(references),
    assessedAt: normalizedRepository.assessedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function normalizeRepository(repository) {
  if (isRecord(repository)) {
    return {
      ...repository,
      repositoryId: hasText(repository.repositoryId) ? repository.repositoryId : 'unidentified-repository'
    };
  }

  return {
    repositoryId: 'unidentified-repository',
    assessedAt: null,
    policy: {},
    references: [],
    __malformedRepositoryPacket: true
  };
}

function assessRepositoryPacket(repository) {
  if (repository.__malformedRepositoryPacket) {
    return [
      finding(
        { id: repository.repositoryId, kind: 'repository', target: null },
        'MALFORMED_REPOSITORY_PACKET',
        'blocker',
        'Repository external-reference packet must be a structured object before release.'
      )
    ];
  }

  if (!hasValidTimestamp(repository.assessedAt)) {
    return [
      finding(
        { id: repository.repositoryId, kind: 'repository', target: null },
        'INVALID_REPOSITORY_ASSESSED_AT',
        'blocker',
        'Repository assessment timestamp must be present and parseable before reference release.'
      )
    ];
  }

  return [];
}

function assessReference(reference, assessedAt, policy) {
  if (reference.__malformedReferenceManifest) {
    return [
      finding(reference, 'MALFORMED_REFERENCE_MANIFEST', 'blocker', 'External reference manifest must be an array before release.')
    ];
  }

  if (reference.__malformedReferenceEntry) {
    return [
      finding(reference, 'MALFORMED_REFERENCE_ENTRY', 'blocker', 'External reference entry must be a structured object before release.')
    ];
  }

  const findings = [];

  if (reference.__missingReferenceId) {
    findings.push(finding(reference, 'MISSING_REFERENCE_ID', 'blocker', 'External reference entry needs a stable ID before reviewer remediation or export release.'));
  }

  if (hasInvalidChecksumEvidence(reference)) {
    findings.push(finding(reference, 'INVALID_CHECKSUM_EVIDENCE', 'blocker', 'Checksum evidence must use a supported algorithm and full-length hexadecimal digest.'));
  }

  if (hasInvalidDoiEvidence(reference)) {
    findings.push(finding(reference, 'INVALID_DOI_EVIDENCE', 'blocker', 'DOI evidence must be a parseable DOI or DOI URL before release.'));
  }

  if (isGitReference(reference) && !hasPinnedCommit(reference)) {
    findings.push(finding(reference, 'FLOATING_GIT_REFERENCE', 'blocker', 'Git reference must be pinned to an immutable commit SHA before release.'));
  }

  if (reference.kind === 'api_source' && !hasSnapshotEvidence(reference, assessedAt)) {
    findings.push(finding(reference, 'FLOATING_API_REFERENCE', 'blocker', 'API source must reference a dated snapshot with checksum evidence.'));
  }

  if (needsDurableIdentifier(reference) && !hasDurableIdentifier(reference)) {
    findings.push(finding(reference, 'MISSING_DURABLE_IDENTIFIER', 'blocker', 'External data or model reference needs a checksum, DOI, or immutable version.'));
  }

  if (reference.authRequired) {
    findings.push(finding(reference, 'AUTH_REQUIRED_REFERENCE', 'blocker', 'Export bundles cannot depend on authenticated external references.'));
  }

  if (!hasText(reference.license)) {
    findings.push(finding(reference, 'MISSING_LICENSE', 'warning', 'External reference needs license metadata before DOI publication.'));
  }

  if (!hasText(reference.attribution)) {
    findings.push(finding(reference, 'MISSING_ATTRIBUTION', 'warning', 'External reference needs attribution metadata before DOI publication.'));
  }

  if (hasMissingVerificationEvidence(reference, findings)) {
    findings.push(finding(reference, 'STALE_REFERENCE_EVIDENCE', 'blocker', 'External reference needs verification evidence before release.'));
  } else if (isStale(reference.lastVerifiedAt, assessedAt, policy.maxReferenceAgeDays)) {
    findings.push(finding(reference, 'STALE_REFERENCE_EVIDENCE', 'blocker', 'External reference verification is older than policy allows.'));
  }

  return findings;
}

function isGitReference(reference) {
  return reference.kind === 'git_submodule' || reference.kind === 'external_code';
}

function hasPinnedCommit(reference) {
  const commitSha = reference.commitSha || '';
  return /^[a-f0-9]{40}$/i.test(commitSha) && !/^0{40}$/.test(commitSha);
}

function hasSnapshotEvidence(reference, assessedAt) {
  if (!hasText(reference.snapshotDate) || !hasValidChecksum(reference.checksum)) return false;
  const snapshot = Date.parse(reference.snapshotDate);
  const assessed = Date.parse(assessedAt);
  if (Number.isNaN(snapshot) || Number.isNaN(assessed)) return false;
  return snapshot <= assessed;
}

function needsDurableIdentifier(reference) {
  return ['linked_dataset', 'model_weights', 'external_data'].includes(reference.kind);
}

function normalizeReferenceEntries(value) {
  if (!Array.isArray(value)) {
    return [
      {
        id: 'reference-manifest',
        kind: 'unknown',
        target: null,
        __malformedReferenceManifest: true
      }
    ];
  }

  return value.map((reference, index) => {
    if (isRecord(reference)) {
      if (hasText(reference.id)) return reference;
      return {
        ...reference,
        id: `unidentified-reference-${index + 1}`,
        __missingReferenceId: true
      };
    }

    return {
      id: `malformed-reference-entry-${index + 1}`,
      kind: 'unknown',
      target: null,
      __malformedReferenceEntry: true
    };
  });
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function hasDurableIdentifier(reference) {
  return hasValidChecksum(reference.checksum) || hasValidDoi(reference.doi) || hasImmutableVersion(reference.version);
}

function hasValidChecksum(checksum) {
  if (typeof checksum !== 'string') return false;
  const match = checksum.trim().match(/^(sha256|sha384|sha512):([a-f0-9]+)$/i);
  if (!match) return false;

  const algorithm = match[1].toLowerCase();
  return match[2].length === CHECKSUM_HEX_LENGTHS[algorithm];
}

function hasValidDoi(doi) {
  if (!hasText(doi)) return false;
  const normalized = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  return /^10\.\d{4,9}\/\S+$/i.test(normalized);
}

function hasInvalidChecksumEvidence(reference) {
  return hasText(reference.checksum) && !hasValidChecksum(reference.checksum);
}

function hasInvalidDoiEvidence(reference) {
  return hasText(reference.doi) && !hasValidDoi(reference.doi);
}

function hasImmutableVersion(version) {
  if (!hasText(version)) return false;
  return !/^(latest|main|master|head|current|stable|dev|nightly)$/i.test(version.trim());
}

function hasMissingVerificationEvidence(reference, findings) {
  return !hasText(reference.lastVerifiedAt)
    && !findings.some((item) => item.severity === 'blocker');
}

function isStale(lastVerifiedAt, assessedAt, maxAgeDays) {
  if (!lastVerifiedAt || !assessedAt) return false;
  const verified = Date.parse(lastVerifiedAt);
  const assessed = Date.parse(assessedAt);
  if (Number.isNaN(verified) || Number.isNaN(assessed)) return true;
  if (verified > assessed) return true;
  const ageDays = Math.max(0, (assessed - verified) / (24 * 60 * 60 * 1000));
  return ageDays > maxAgeDays;
}

function chooseStatus(blockerCount, warningCount) {
  if (blockerCount > 0) return 'hold_repository_release';
  if (warningCount > 0) return 'stage_reference_metadata_revision';
  return 'release_repository_references';
}

function chooseReleaseLanes(blockerCount, warningCount) {
  if (blockerCount > 0) {
    return {
      doiPublication: 'blocked',
      exportBundle: 'blocked',
      apiAccess: 'metadata_only'
    };
  }

  if (warningCount > 0) {
    return {
      doiPublication: 'metadata_revision',
      exportBundle: 'draft_only',
      apiAccess: 'allowed'
    };
  }

  return {
    doiPublication: 'allowed',
    exportBundle: 'allowed',
    apiAccess: 'allowed'
  };
}

function buildActions(repository, findings) {
  if (!findings.length) return [`release_with_reference_pin_monitoring:${repository.repositoryId}`];

  const byReference = new Map();
  for (const item of findings) {
    if (!byReference.has(item.referenceId)) byReference.set(item.referenceId, new Set());
    byReference.get(item.referenceId).add(item.code);
  }

  const actions = new Set();
  for (const [referenceId, codes] of byReference.entries()) {
    if (codes.has('MALFORMED_REPOSITORY_PACKET')) actions.add(`repair_repository_packet:${referenceId}`);
    if (codes.has('INVALID_REPOSITORY_ASSESSED_AT')) actions.add(`repair_repository_assessed_at:${referenceId}`);
    if (codes.has('MALFORMED_REFERENCE_MANIFEST')) actions.add(`repair_reference_manifest:${referenceId}`);
    if (codes.has('MALFORMED_REFERENCE_ENTRY')) actions.add(`repair_reference_entry:${referenceId}`);
    if (codes.has('MISSING_REFERENCE_ID')) actions.add(`assign_reference_id:${referenceId}`);
    if (codes.has('AUTH_REQUIRED_REFERENCE')) actions.add(`replace_or_snapshot_auth_reference:${referenceId}`);
    if (codes.has('FLOATING_GIT_REFERENCE') || codes.has('FLOATING_API_REFERENCE')) actions.add(`pin_external_reference:${referenceId}`);
    if (codes.has('INVALID_CHECKSUM_EVIDENCE') || codes.has('INVALID_DOI_EVIDENCE')) actions.add(`repair_reference_evidence:${referenceId}`);
    if (codes.has('MISSING_DURABLE_IDENTIFIER')) actions.add(`add_checksum_or_doi:${referenceId}`);
    if (codes.has('STALE_REFERENCE_EVIDENCE')) actions.add(`refresh_reference_verification:${referenceId}`);
    if (codes.has('MISSING_LICENSE') || codes.has('MISSING_ATTRIBUTION')) actions.add(`complete_license_attribution:${referenceId}`);
  }

  return [...actions].sort();
}

function buildSignals(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    immutablePins: !codes.has('MALFORMED_REPOSITORY_PACKET')
      && !codes.has('MALFORMED_REFERENCE_MANIFEST')
      && !codes.has('MALFORMED_REFERENCE_ENTRY')
      && !codes.has('MISSING_REFERENCE_ID')
      && !codes.has('FLOATING_GIT_REFERENCE')
      && !codes.has('FLOATING_API_REFERENCE'),
    exportable: !codes.has('MALFORMED_REPOSITORY_PACKET')
      && !codes.has('INVALID_REPOSITORY_ASSESSED_AT')
      && !codes.has('MALFORMED_REFERENCE_MANIFEST')
      && !codes.has('MALFORMED_REFERENCE_ENTRY')
      && !codes.has('MISSING_REFERENCE_ID')
      && !codes.has('AUTH_REQUIRED_REFERENCE')
      && !codes.has('MISSING_DURABLE_IDENTIFIER')
      && !codes.has('INVALID_CHECKSUM_EVIDENCE')
      && !codes.has('INVALID_DOI_EVIDENCE'),
    attributionComplete: !codes.has('MALFORMED_REPOSITORY_PACKET')
      && !codes.has('MALFORMED_REFERENCE_MANIFEST')
      && !codes.has('MALFORMED_REFERENCE_ENTRY')
      && !codes.has('MISSING_REFERENCE_ID')
      && !codes.has('MISSING_LICENSE')
      && !codes.has('MISSING_ATTRIBUTION'),
    verificationFresh: !codes.has('MALFORMED_REPOSITORY_PACKET')
      && !codes.has('INVALID_REPOSITORY_ASSESSED_AT')
      && !codes.has('MALFORMED_REFERENCE_MANIFEST')
      && !codes.has('MALFORMED_REFERENCE_ENTRY')
      && !codes.has('MISSING_REFERENCE_ID')
      && !codes.has('STALE_REFERENCE_EVIDENCE')
  };
}

function summarizeReferences(references = []) {
  return references.reduce((summary, reference) => {
    summary.total += 1;
    summary.byKind[reference.kind] = (summary.byKind[reference.kind] || 0) + 1;
    return summary;
  }, { total: 0, byKind: {} });
}

function finding(reference, code, severity, message) {
  return {
    referenceId: reference.id,
    kind: reference.kind,
    target: sanitizeReferenceTarget(reference.target),
    code,
    severity,
    message
  };
}

function sanitizeReferenceTarget(target) {
  if (typeof target !== 'string') return target;
  return target
    .replace(/\/\/([^/@\s]+):([^/@\s]+)@/g, '//[redacted-credentials]@')
    .replace(/([?&](?:access_token|api_key|key|secret|signature|sig|token)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/file:\/\/[^ \s"')]+/gi, '[redacted-local-path]')
    .replace(/[A-Z]:[\\/]Users[\\/][^ \s"')]+/gi, '[redacted-local-path]')
    .replace(/\/Users\/[^ \s"')]+/g, '[redacted-local-path]')
    .replace(/\/home\/[^ \s"')]+/g, '[redacted-local-path]')
    .replace(/\bmailto:[^ \s"')]+/gi, '[redacted-private-reference]')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[redacted-private-reference]')
    .replace(/\borcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]\b/gi, '[redacted-private-reference]')
    .replace(/\b(?:private-lab|patient-export)\b/gi, '[redacted-private-reference]');
}

function compareFindings(left, right) {
  return `${left.referenceId}:${left.code}`.localeCompare(`${right.referenceId}:${right.code}`);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasValidTimestamp(value) {
  return hasText(value) && !Number.isNaN(Date.parse(value));
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessExternalReferences
};
