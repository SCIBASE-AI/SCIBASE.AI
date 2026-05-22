'use strict';

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  asOfDate: '2026-05-22',
  lockfileFreshnessDays: 90,
  criticalSeverities: ['critical', 'high'],
  runtimeScopes: ['runtime', 'production', 'notebook', 'model-serving'],
  executionSurfaces: ['preview', 'reproduce_button', 'scheduled_rerun', 'export_bundle'],
  exploitMaturityBlocklist: ['weaponized', 'public_poc', 'known_exploited']
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

function parseVersion(version) {
  const parts = String(version).split('.').map((part) => Number.parseInt(part.replace(/[^0-9].*$/, ''), 10));
  while (parts.length < 3) parts.push(0);
  if (parts.slice(0, 3).some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid semver-like version: ${version}`);
  }
  return parts.slice(0, 3);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function satisfiesComparator(version, comparator) {
  const trimmed = comparator.trim();
  if (!trimmed) return true;
  const match = trimmed.match(/^(<=|>=|<|>|=)?\s*([0-9]+(?:\.[0-9]+){0,2})$/);
  if (!match) {
    throw new Error(`Unsupported advisory range comparator: ${comparator}`);
  }
  const operator = match[1] || '=';
  const target = match[2];
  const comparison = compareVersions(version, target);

  if (operator === '<') return comparison < 0;
  if (operator === '<=') return comparison <= 0;
  if (operator === '>') return comparison > 0;
  if (operator === '>=') return comparison >= 0;
  return comparison === 0;
}

function versionInRange(version, range) {
  if (!range || range === '*') return true;
  return String(range).split(/\s+/).filter(Boolean).every((part) => satisfiesComparator(version, part));
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function getLockfileAgeDays(artifact, policy) {
  if (!artifact.lockfile || !artifact.lockfile.present || !artifact.lockfile.generatedAt) return null;
  return daysBetween(artifact.lockfile.generatedAt, policy.asOfDate);
}

function isLockfileFresh(artifact, policy) {
  const age = getLockfileAgeDays(artifact, policy);
  return age !== null && age >= 0 && age <= policy.lockfileFreshnessDays;
}

function matchAdvisories(component, advisories) {
  return advisories.filter((advisory) => (
    normalizeName(advisory.packageName) === normalizeName(component.name)
    && versionInRange(component.version, advisory.affectedRange)
  ));
}

function componentScope(component) {
  return String(component.scope || 'runtime').toLowerCase();
}

function isRuntimeComponent(component, policy) {
  return policy.runtimeScopes.includes(componentScope(component)) || component.direct === true;
}

function artifactHasExecutionSurface(artifact, policy) {
  const surfaces = artifact.executionSurfaces || [];
  return surfaces.some((surface) => policy.executionSurfaces.includes(surface));
}

function assessFinding(component, advisory, artifact, policy) {
  const severity = String(advisory.severity || 'low').toLowerCase();
  const runtime = isRuntimeComponent(component, policy) || advisory.affectsRuntime === true;
  const exploitable = policy.exploitMaturityBlocklist.includes(String(advisory.exploitMaturity || '').toLowerCase());
  const executable = artifactHasExecutionSurface(artifact, policy);
  const lockfileFresh = isLockfileFresh(artifact, policy);
  const critical = policy.criticalSeverities.includes(severity);

  let treatment = 'warn_remediate';
  if (critical && runtime && executable) {
    treatment = 'quarantine_execution';
  } else if ((critical || exploitable) && executable) {
    treatment = 'hold_for_advisory_review';
  } else if (!lockfileFresh && runtime) {
    treatment = 'hold_for_lockfile_refresh';
  }

  return {
    component: component.name,
    version: component.version,
    scope: componentScope(component),
    advisoryId: advisory.id,
    severity,
    cve: advisory.cve || null,
    affectedRange: advisory.affectedRange,
    fixedVersion: advisory.fixedVersion || null,
    exploitMaturity: advisory.exploitMaturity || 'unknown',
    runtime,
    treatment,
    rationale: buildFindingRationale({ severity, runtime, exploitable, executable, lockfileFresh, advisory })
  };
}

function buildFindingRationale(context) {
  const parts = [];
  if (context.severity) parts.push(`${context.severity} severity`);
  if (context.runtime) parts.push('runtime component');
  if (context.exploitable) parts.push('exploit maturity requires quarantine');
  if (context.executable) parts.push('artifact has executable surfaces');
  if (!context.lockfileFresh) parts.push('lockfile is missing or stale');
  if (context.advisory.fixedVersion) parts.push(`fixed in ${context.advisory.fixedVersion}`);
  return parts.join('; ');
}

function selectArtifactAction(artifact, findings, policy) {
  if (artifactHasExecutionSurface(artifact, policy) && (!artifact.lockfile || !artifact.lockfile.present)) {
    return {
      action: 'hold_missing_lockfile',
      severity: 'high',
      reason: 'executable artifact has no lockfile/SBOM freshness evidence'
    };
  }

  if (findings.some((finding) => finding.treatment === 'quarantine_execution')) {
    return {
      action: 'quarantine_execution_surfaces',
      severity: 'critical',
      reason: 'critical or high runtime advisory affects executable preview/rerun/export surfaces'
    };
  }

  if (findings.some((finding) => finding.treatment === 'hold_for_advisory_review')) {
    return {
      action: 'hold_for_advisory_review',
      severity: 'high',
      reason: 'advisory exposure requires reviewer approval before execution or export'
    };
  }

  if (findings.some((finding) => finding.treatment === 'hold_for_lockfile_refresh')) {
    return {
      action: 'refresh_lockfile_before_rerun',
      severity: 'medium',
      reason: 'runtime dependency evidence is stale and must be refreshed before rerun'
    };
  }

  if (!isLockfileFresh(artifact, policy) && artifactHasExecutionSurface(artifact, policy)) {
    return {
      action: 'refresh_lockfile_before_rerun',
      severity: 'medium',
      reason: 'lockfile freshness exceeds policy window'
    };
  }

  if (findings.length > 0) {
    return {
      action: 'warn_and_remediate_before_release',
      severity: 'medium',
      reason: 'non-blocking advisory findings should be remediated before release'
    };
  }

  return {
    action: 'allow_preview_rerun_export',
    severity: 'low',
    reason: 'no matching advisories and lockfile evidence satisfies policy'
  };
}

function buildReviewerActions(packet) {
  const actions = [];

  if (packet.action === 'hold_missing_lockfile') {
    actions.push('attach generated SBOM and lockfile digest before enabling execution');
    actions.push('disable preview, reproduce button, scheduled rerun, and export bundle');
  } else if (packet.action === 'quarantine_execution_surfaces') {
    actions.push('quarantine executable surfaces until fixed versions are pinned');
    actions.push('notify artifact owner with affected components and fixed versions');
  } else if (packet.action === 'hold_for_advisory_review') {
    actions.push('route advisory packet to data/code steward for release decision');
    actions.push('keep metadata-only preview visible while executable actions are disabled');
  } else if (packet.action === 'refresh_lockfile_before_rerun') {
    actions.push('regenerate lockfile/SBOM and rerun advisory matching');
    actions.push('hold scheduled reruns until fresh dependency evidence is attached');
  } else if (packet.action === 'warn_and_remediate_before_release') {
    actions.push('show reviewer warning and remediation recommendation');
    actions.push('allow metadata preview but flag release checklist until upgraded');
  } else {
    actions.push('allow previews, reproduce actions, reruns, and export bundle');
    actions.push('preserve advisory audit digest for reviewer packet');
  }

  return actions;
}

function evaluateArtifact(artifact, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {}, {
    asOfDate: options.asOfDate || (options.policy && options.policy.asOfDate) || DEFAULT_POLICY.asOfDate
  });
  const advisories = options.advisories || [];

  toDate(policy.asOfDate, 'asOfDate');
  if (artifact.lockfile && artifact.lockfile.generatedAt) {
    toDate(artifact.lockfile.generatedAt, 'lockfile.generatedAt');
  }

  const findings = (artifact.sbom || []).flatMap((component) => (
    matchAdvisories(component, advisories).map((advisory) => assessFinding(component, advisory, artifact, policy))
  ));
  const selected = selectArtifactAction(artifact, findings, policy);
  const packet = {
    artifactId: artifact.id,
    artifactType: artifact.type,
    language: artifact.language,
    action: selected.action,
    severity: selected.severity,
    reason: selected.reason,
    executionSurfaces: artifact.executionSurfaces || [],
    lockfilePresent: Boolean(artifact.lockfile && artifact.lockfile.present),
    lockfileAgeDays: getLockfileAgeDays(artifact, policy),
    lockfileFresh: isLockfileFresh(artifact, policy),
    sbomComponentCount: (artifact.sbom || []).length,
    findingCount: findings.length,
    findings,
    reviewerActions: [],
    policySnapshot: {
      asOfDate: policy.asOfDate,
      lockfileFreshnessDays: policy.lockfileFreshnessDays,
      criticalSeverities: policy.criticalSeverities.slice(),
      exploitMaturityBlocklist: policy.exploitMaturityBlocklist.slice()
    }
  };

  packet.reviewerActions = buildReviewerActions(packet);
  packet.auditDigest = digest({
    artifact: sanitizeArtifact(artifact),
    packet: Object.assign({}, packet, { auditDigest: undefined })
  });

  return packet;
}

function sanitizeArtifact(artifact) {
  return {
    id: artifact.id,
    type: artifact.type,
    language: artifact.language,
    executionSurfaces: artifact.executionSurfaces || [],
    lockfileDigest: artifact.lockfile && artifact.lockfile.digest ? artifact.lockfile.digest : null,
    componentNames: (artifact.sbom || []).map((component) => normalizeName(component.name)).sort()
  };
}

function evaluatePortfolio(artifacts, options = {}) {
  const packets = artifacts.map((artifact) => evaluateArtifact(artifact, options));
  const summary = packets.reduce((acc, packet) => {
    acc.byAction[packet.action] = (acc.byAction[packet.action] || 0) + 1;
    acc.bySeverity[packet.severity] = (acc.bySeverity[packet.severity] || 0) + 1;
    if (packet.severity === 'critical' || packet.severity === 'high') {
      acc.blockedArtifacts.push(packet.artifactId);
    }
    acc.findingCount += packet.findingCount;
    return acc;
  }, {
    byAction: {},
    bySeverity: {},
    blockedArtifacts: [],
    findingCount: 0
  });

  const portfolio = {
    asOfDate: options.asOfDate || DEFAULT_POLICY.asOfDate,
    artifactCount: packets.length,
    findingCount: summary.findingCount,
    byAction: summary.byAction,
    bySeverity: summary.bySeverity,
    blockedArtifacts: summary.blockedArtifacts,
    packets
  };

  portfolio.auditDigest = digest(portfolio);
  return portfolio;
}

module.exports = {
  DEFAULT_POLICY,
  compareVersions,
  daysBetween,
  digest,
  evaluateArtifact,
  evaluatePortfolio,
  matchAdvisories,
  versionInRange
};
