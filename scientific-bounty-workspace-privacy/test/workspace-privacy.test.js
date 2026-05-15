'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const sample = require('../data/sample-workspaces.json');
const {
  buildSubmissionPackage,
  decideWorkspaceAccess,
  evaluatePrequalification,
  evaluateWorkspacePrivacy,
  summarizePortfolio
} = require('../src/workspace-privacy');

const [readyWorkspace, blockedWorkspace] = sample.workspaces;

test('prequalification separates eligible and held solver teams', () => {
  const ready = evaluatePrequalification(sample.challenge, readyWorkspace);
  const blocked = evaluatePrequalification(sample.challenge, blockedWorkspace);

  assert.equal(ready.status, 'eligible');
  assert.equal(ready.blockers.length, 0);
  assert.equal(blocked.status, 'hold');
  assert.deepEqual(
    blocked.blockers.map((blocker) => blocker.code).sort(),
    ['institution-not-eligible', 'nda-missing']
  );
  assert.equal(blocked.warnings[0].code, 'declared-conflict');
});

test('workspace privacy catches missing deliverables, hashes, and reviewer conflicts', () => {
  const report = evaluateWorkspacePrivacy(sample.challenge, blockedWorkspace);
  const blockerCodes = report.blockers.map((blocker) => blocker.code).sort();

  assert.equal(report.status, 'hold');
  assert.ok(blockerCodes.includes('artifact-hash-missing'));
  assert.ok(blockerCodes.includes('deliverable-missing'));
  assert.ok(blockerCodes.includes('reviewer-conflict'));
  assert.ok(blockerCodes.includes('nda-missing'));
});

test('submission package redacts anonymous members and confidential titles', () => {
  const pack = buildSubmissionPackage(sample.challenge, readyWorkspace);

  assert.equal(pack.workspace.teamName, 'anonymous solver team');
  assert.equal(pack.members[0].name, undefined);
  assert.equal(pack.members[0].id, 'solver-7f3a');
  assert.equal(pack.artifacts.find((artifact) => artifact.id === 'artifact-model').title, 'confidential artifact');
  assert.match(pack.packageDigest, /^[a-f0-9]{64}$/);
  assert.equal(pack.blockers.length, 0);
});

test('access policy denies sponsor confidential review until payment and allows arbitrator on dispute', () => {
  const sponsorDecision = decideWorkspaceAccess(
    sample.challenge,
    readyWorkspace,
    { role: 'sponsor' },
    'viewArtifact',
    {
      artifactId: 'artifact-model',
      now: '2026-06-16T12:00:00.000Z'
    }
  );
  const arbitratorDecision = decideWorkspaceAccess(
    sample.challenge,
    readyWorkspace,
    { role: 'arbitrator' },
    'viewArtifact',
    {
      artifactId: 'artifact-model',
      disputeOpen: true,
      now: '2026-05-30T12:00:00.000Z'
    }
  );
  const previewDecision = decideWorkspaceAccess(
    sample.challenge,
    readyWorkspace,
    { role: 'sponsor' },
    'viewArtifact',
    {
      artifactId: 'artifact-summary',
      now: '2026-05-30T12:00:00.000Z'
    }
  );

  assert.equal(sponsorDecision.decision, 'denied');
  assert.equal(sponsorDecision.reason, 'confidentiality-or-payment-gate');
  assert.equal(arbitratorDecision.decision, 'allowed');
  assert.equal(previewDecision.decision, 'allowed');
});

test('package export is allowed only when privacy blockers are cleared', () => {
  const readyDecision = decideWorkspaceAccess(sample.challenge, readyWorkspace, { role: 'solver' }, 'export-package');
  const blockedDecision = decideWorkspaceAccess(sample.challenge, blockedWorkspace, { role: 'solver' }, 'export-package');

  assert.equal(readyDecision.decision, 'allowed');
  assert.equal(blockedDecision.decision, 'denied');
  assert.ok(blockedDecision.blockerCount > 0);
});

test('portfolio summary produces deterministic digests', () => {
  const first = summarizePortfolio(sample.challenge, sample.workspaces);
  const second = summarizePortfolio(sample.challenge, sample.workspaces);

  assert.equal(first.ready, 1);
  assert.equal(first.hold, 1);
  assert.equal(first.portfolioDigest, second.portfolioDigest);
  assert.match(first.workspaces[0].packageDigest, /^[a-f0-9]{64}$/);
});
