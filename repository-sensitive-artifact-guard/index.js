'use strict';

const crypto = require('crypto');

const DEFAULT_POLICY = Object.freeze({
  asOfDate: '2026-05-22',
  largeFileBytes: 25 * 1024 * 1024,
  publicExposureVisibilities: ['public', 'preprint_export', 'doi_snapshot'],
  criticalSignals: ['credential_marker', 'private_key_marker', 'raw_patient_identifier', 'restricted_raw_dataset'],
  highSignals: ['notebook_output_leak', 'consent_form_marker', 'human_subjects_column', 'license_restricted_data'],
  lfsRequiredKinds: ['dataset', 'model_weights', 'binary_result'],
  releaseSurfaces: ['tag', 'merge_request', 'export_bundle', 'doi_snapshot']
});

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function normalizePath(path) {
  return String(path || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function inferComponent(path) {
  const normalized = normalizePath(path);
  const first = normalized.split('/')[0] || 'root';
  if (['manuscript', 'data', 'code', 'notebooks', 'results', 'protocols'].includes(first)) return first;
  if (normalized === 'metadata.json') return 'metadata';
  return first;
}

function isPublicExposure(artifact, policy) {
  const visibility = normalizeToken(artifact.visibility || artifact.exportVisibility || 'private');
  return policy.publicExposureVisibilities.includes(visibility);
}

function artifactSignals(artifact) {
  return new Set((artifact.signals || []).map(normalizeToken).filter(Boolean));
}

function addFinding(findings, code, severity, message, remediation) {
  findings.push({ code, severity, message, remediation });
}

function evaluateArtifact(artifact, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {});
  const path = normalizePath(artifact.path);
  const component = artifact.component || inferComponent(path);
  const kind = normalizeToken(artifact.kind || component);
  const signals = artifactSignals(artifact);
  const findings = [];
  const publicExposure = isPublicExposure(artifact, policy);
  const sizeBytes = Number(artifact.sizeBytes || 0);
  const lfsPointer = Boolean(artifact.lfsPointer);

  for (const signal of signals) {
    if (policy.criticalSignals.includes(signal)) {
      addFinding(
        findings,
        signal,
        publicExposure ? 'critical' : 'high',
        `${path} contains ${signal.replace(/_/g, ' ')} evidence`,
        publicExposure
          ? 'remove artifact from public/tag/export surfaces and rewrite the commit before merge'
          : 'route artifact to restricted storage and require steward approval before merge'
      );
    } else if (policy.highSignals.includes(signal)) {
      addFinding(
        findings,
        signal,
        publicExposure ? 'high' : 'medium',
        `${path} contains ${signal.replace(/_/g, ' ')} evidence`,
        publicExposure
          ? 'redact or replace the artifact before creating a public snapshot'
          : 'attach restricted-data review evidence before merge'
      );
    }
  }

  if (/(\.env|\.pem|id_rsa|credentials|secrets?)($|[./_-])/i.test(path)) {
    addFinding(
      findings,
      'sensitive_path_name',
      publicExposure ? 'critical' : 'high',
      `${path} matches a sensitive path naming rule`,
      'move the file out of version control and add a deny rule before rewriting the commit'
    );
  }

  if (sizeBytes > policy.largeFileBytes && !lfsPointer && policy.lfsRequiredKinds.includes(kind)) {
    addFinding(
      findings,
      'missing_lfs_pointer',
      'medium',
      `${path} is ${sizeBytes} bytes and is not routed through Git LFS`,
      'replace inline blob with an LFS pointer and preserve the content hash in the manifest'
    );
  }

  if (publicExposure && normalizeToken(artifact.dataClass) === 'restricted') {
    addFinding(
      findings,
      'restricted_data_public_export',
      'critical',
      `${path} is restricted but is included in a public release surface`,
      'block public export and create a restricted-access manifest entry'
    );
  }

  const selected = selectArtifactAction(findings);
  const packet = {
    path,
    component,
    kind,
    visibility: normalizeToken(artifact.visibility || artifact.exportVisibility || 'private'),
    dataClass: normalizeToken(artifact.dataClass || 'unspecified'),
    sizeBytes,
    lfsPointer,
    publicExposure,
    action: selected.action,
    severity: selected.severity,
    reason: selected.reason,
    findingCount: findings.length,
    findings
  };

  packet.auditDigest = digest(Object.assign({}, packet, { auditDigest: undefined }));
  return packet;
}

function selectArtifactAction(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return {
      action: 'reject_commit_and_quarantine_export',
      severity: 'critical',
      reason: 'critical sensitive artifact exposure is present in a release surface'
    };
  }

  if (findings.some((finding) => finding.severity === 'high')) {
    return {
      action: 'hold_tag_for_steward_review',
      severity: 'high',
      reason: 'sensitive artifact evidence needs steward review before merge or tag'
    };
  }

  if (findings.some((finding) => finding.severity === 'medium')) {
    return {
      action: 'require_lfs_or_redaction_before_merge',
      severity: 'medium',
      reason: 'repository hygiene remediation is required before merge'
    };
  }

  return {
    action: 'allow_commit_tag_export',
    severity: 'low',
    reason: 'artifact satisfies sensitive-data and LFS policy'
  };
}

function evaluateCommitBundle(bundle, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {}, {
    asOfDate: options.asOfDate || (options.policy && options.policy.asOfDate) || DEFAULT_POLICY.asOfDate
  });

  const artifacts = (bundle.artifacts || []).map((artifact) => evaluateArtifact(artifact, { policy }));
  const selected = selectBundleAction(artifacts);
  const rollbackPacket = buildRollbackPacket(bundle, artifacts, selected);
  const summary = artifacts.reduce((acc, artifact) => {
    acc.byAction[artifact.action] = (acc.byAction[artifact.action] || 0) + 1;
    acc.bySeverity[artifact.severity] = (acc.bySeverity[artifact.severity] || 0) + 1;
    if (artifact.severity === 'critical' || artifact.severity === 'high') {
      acc.heldPaths.push(artifact.path);
    }
    acc.findingCount += artifact.findingCount;
    return acc;
  }, {
    byAction: {},
    bySeverity: {},
    heldPaths: [],
    findingCount: 0
  });

  const packet = {
    asOfDate: policy.asOfDate,
    repositoryId: bundle.repositoryId,
    branch: bundle.branch,
    targetSurface: normalizeToken(bundle.targetSurface || 'merge_request'),
    commitId: bundle.commitId,
    action: selected.action,
    severity: selected.severity,
    reason: selected.reason,
    artifactCount: artifacts.length,
    findingCount: summary.findingCount,
    heldPaths: summary.heldPaths,
    byAction: summary.byAction,
    bySeverity: summary.bySeverity,
    artifacts,
    rollbackPacket,
    policySnapshot: {
      largeFileBytes: policy.largeFileBytes,
      releaseSurfaces: policy.releaseSurfaces.slice(),
      publicExposureVisibilities: policy.publicExposureVisibilities.slice()
    }
  };

  packet.auditDigest = digest(Object.assign({}, packet, { auditDigest: undefined }));
  return packet;
}

function selectBundleAction(artifacts) {
  if (artifacts.some((artifact) => artifact.severity === 'critical')) {
    return {
      action: 'reject_bundle_and_require_history_rewrite',
      severity: 'critical',
      reason: 'commit bundle contains critical sensitive artifact exposure'
    };
  }

  if (artifacts.some((artifact) => artifact.severity === 'high')) {
    return {
      action: 'hold_release_for_steward_review',
      severity: 'high',
      reason: 'commit bundle contains sensitive artifacts that need steward approval'
    };
  }

  if (artifacts.some((artifact) => artifact.severity === 'medium')) {
    return {
      action: 'require_repository_hygiene_fix',
      severity: 'medium',
      reason: 'commit bundle needs LFS routing or redaction before merge'
    };
  }

  return {
    action: 'allow_merge_tag_export',
    severity: 'low',
    reason: 'commit bundle satisfies sensitive-artifact policy'
  };
}

function buildRollbackPacket(bundle, artifacts, selected) {
  const rejectedArtifacts = artifacts.filter((artifact) => artifact.severity === 'critical' || artifact.severity === 'high');
  const hygieneArtifacts = artifacts.filter((artifact) => artifact.severity === 'medium');
  const remediationActions = [];

  for (const artifact of rejectedArtifacts) {
    for (const finding of artifact.findings) {
      remediationActions.push({
        path: artifact.path,
        code: finding.code,
        action: finding.remediation
      });
    }
  }

  for (const artifact of hygieneArtifacts) {
    remediationActions.push({
      path: artifact.path,
      code: 'repository_hygiene',
      action: artifact.findings.map((finding) => finding.remediation).join('; ')
    });
  }

  return {
    commitId: bundle.commitId,
    branch: bundle.branch,
    decision: selected.action,
    rewriteRequired: selected.severity === 'critical',
    releaseHoldRequired: selected.severity === 'critical' || selected.severity === 'high',
    heldPaths: rejectedArtifacts.map((artifact) => artifact.path),
    lfsPaths: hygieneArtifacts.filter((artifact) => artifact.findings.some((finding) => finding.code === 'missing_lfs_pointer')).map((artifact) => artifact.path),
    remediationActions,
    rollbackDigest: digest({
      commitId: bundle.commitId,
      rejected: rejectedArtifacts.map((artifact) => artifact.auditDigest),
      hygiene: hygieneArtifacts.map((artifact) => artifact.auditDigest)
    })
  };
}

function evaluateRepository(bundles, options = {}) {
  const packets = bundles.map((bundle) => evaluateCommitBundle(bundle, options));
  const summary = packets.reduce((acc, packet) => {
    acc.byAction[packet.action] = (acc.byAction[packet.action] || 0) + 1;
    acc.bySeverity[packet.severity] = (acc.bySeverity[packet.severity] || 0) + 1;
    if (packet.severity === 'critical' || packet.severity === 'high') {
      acc.heldCommits.push(packet.commitId);
    }
    acc.findingCount += packet.findingCount;
    return acc;
  }, {
    byAction: {},
    bySeverity: {},
    heldCommits: [],
    findingCount: 0
  });

  const portfolio = {
    asOfDate: options.asOfDate || DEFAULT_POLICY.asOfDate,
    bundleCount: packets.length,
    findingCount: summary.findingCount,
    heldCommits: summary.heldCommits,
    byAction: summary.byAction,
    bySeverity: summary.bySeverity,
    packets
  };

  portfolio.auditDigest = digest(portfolio);
  return portfolio;
}

module.exports = {
  DEFAULT_POLICY,
  digest,
  evaluateArtifact,
  evaluateCommitBundle,
  evaluateRepository,
  inferComponent,
  normalizePath
};
