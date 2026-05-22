'use strict';

const assert = require('assert');
const {
  compareVersions,
  evaluateArtifact,
  evaluatePortfolio,
  matchAdvisories,
  versionInRange
} = require('./index');

const asOfDate = '2026-05-22';

const advisories = [
  {
    id: 'ADV-PANDAS-001',
    packageName: 'pandas',
    affectedRange: '<2.2.2',
    severity: 'high',
    cve: 'CVE-2026-1001',
    exploitMaturity: 'public_poc',
    fixedVersion: '2.2.2',
    affectsRuntime: true
  },
  {
    id: 'ADV-PLOT-002',
    packageName: 'plotly',
    affectedRange: '<5.20.0',
    severity: 'medium',
    cve: 'CVE-2026-2002',
    exploitMaturity: 'theoretical',
    fixedVersion: '5.20.0',
    affectsRuntime: false
  },
  {
    id: 'ADV-DEV-003',
    packageName: 'eslint',
    affectedRange: '<8.57.0',
    severity: 'low',
    exploitMaturity: 'none',
    fixedVersion: '8.57.0',
    affectsRuntime: false
  }
];

function artifact(overrides) {
  return Object.assign({
    id: 'ART-100',
    type: 'notebook',
    language: 'python',
    executionSurfaces: ['preview', 'reproduce_button'],
    lockfile: {
      present: true,
      generatedAt: '2026-05-10',
      digest: 'lock-demo-1'
    },
    sbom: [
      { name: 'pandas', version: '2.1.4', scope: 'notebook', direct: true },
      { name: 'numpy', version: '1.26.4', scope: 'notebook', direct: true }
    ]
  }, overrides || {});
}

function testVersionMatching() {
  assert.equal(compareVersions('2.1.4', '2.2.2'), -1);
  assert.equal(compareVersions('2.2.2', '2.2.2'), 0);
  assert.equal(compareVersions('2.3.0', '2.2.2'), 1);
  assert.equal(versionInRange('2.1.4', '>=2.0.0 <2.2.2'), true);
  assert.equal(versionInRange('2.2.2', '>=2.0.0 <2.2.2'), false);
}

function testCriticalRuntimeQuarantine() {
  const packet = evaluateArtifact(artifact(), { asOfDate, advisories });

  assert.equal(packet.action, 'quarantine_execution_surfaces');
  assert.equal(packet.severity, 'critical');
  assert.equal(packet.findings[0].advisoryId, 'ADV-PANDAS-001');
  assert.ok(packet.reviewerActions.includes('quarantine executable surfaces until fixed versions are pinned'));
  assert.equal(packet.auditDigest.length, 64);
}

function testMissingLockfileHoldsExecutableArtifact() {
  const packet = evaluateArtifact(artifact({
    id: 'ART-NOLOCK',
    lockfile: { present: false },
    sbom: []
  }), { asOfDate, advisories });

  assert.equal(packet.action, 'hold_missing_lockfile');
  assert.equal(packet.severity, 'high');
}

function testStaleLockfileRefreshesBeforeRerun() {
  const packet = evaluateArtifact(artifact({
    id: 'ART-STALE',
    lockfile: {
      present: true,
      generatedAt: '2025-12-01',
      digest: 'old-lock'
    },
    sbom: [
      { name: 'numpy', version: '1.26.4', scope: 'notebook', direct: true }
    ]
  }), { asOfDate, advisories });

  assert.equal(packet.action, 'refresh_lockfile_before_rerun');
  assert.equal(packet.severity, 'medium');
  assert.equal(packet.lockfileFresh, false);
}

function testDevOnlyAdvisoryWarns() {
  const packet = evaluateArtifact(artifact({
    id: 'ART-DEV',
    type: 'code',
    language: 'javascript',
    executionSurfaces: ['export_bundle'],
    sbom: [
      { name: 'eslint', version: '8.40.0', scope: 'dev', direct: false }
    ]
  }), { asOfDate, advisories });

  assert.equal(packet.action, 'warn_and_remediate_before_release');
  assert.equal(packet.severity, 'medium');
}

function testCleanArtifactAllowed() {
  const packet = evaluateArtifact(artifact({
    id: 'ART-CLEAN',
    sbom: [
      { name: 'pandas', version: '2.2.3', scope: 'notebook', direct: true },
      { name: 'numpy', version: '1.26.4', scope: 'notebook', direct: true }
    ]
  }), { asOfDate, advisories });

  assert.equal(packet.action, 'allow_preview_rerun_export');
  assert.equal(packet.severity, 'low');
  assert.equal(packet.findingCount, 0);
}

function testAdvisoryMatchHelper() {
  const matches = matchAdvisories({ name: 'plotly', version: '5.18.0' }, advisories);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'ADV-PLOT-002');
}

function testPortfolioSummary() {
  const portfolio = evaluatePortfolio([
    artifact({ id: 'ART-BLOCK' }),
    artifact({ id: 'ART-CLEAN', sbom: [{ name: 'pandas', version: '2.2.3', scope: 'notebook', direct: true }] }),
    artifact({ id: 'ART-NOLOCK', lockfile: { present: false }, sbom: [] })
  ], { asOfDate, advisories });

  assert.equal(portfolio.artifactCount, 3);
  assert.equal(portfolio.byAction.quarantine_execution_surfaces, 1);
  assert.equal(portfolio.byAction.allow_preview_rerun_export, 1);
  assert.equal(portfolio.byAction.hold_missing_lockfile, 1);
  assert.ok(portfolio.blockedArtifacts.includes('ART-BLOCK'));
  assert.ok(portfolio.blockedArtifacts.includes('ART-NOLOCK'));
}

const tests = [
  testVersionMatching,
  testCriticalRuntimeQuarantine,
  testMissingLockfileHoldsExecutableArtifact,
  testStaleLockfileRefreshesBeforeRerun,
  testDevOnlyAdvisoryWarns,
  testCleanArtifactAllowed,
  testAdvisoryMatchHelper,
  testPortfolioSummary
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} dependency advisory SBOM guard tests passed`);
