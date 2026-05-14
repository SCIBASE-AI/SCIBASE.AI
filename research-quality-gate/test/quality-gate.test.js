'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../data/sample-project.json');
const {
  buildQualityGate,
  rankResearchGaps,
  renderMarkdownReport,
  scoreEvidenceAlignment,
  scoreReproducibility,
} = require('../src/quality-gate');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('buildQualityGate holds release for unsupported strong claims', () => {
  const gate = buildQualityGate(sample);

  assert.equal(gate.decision, 'hold');
  assert.equal(gate.evidenceAlignment.unsupportedClaims, 2);
  assert.equal(gate.nextActions[0], 'Add direct evidence for claim c2.');
  assert.ok(gate.nextActions.includes('Add direct evidence for claim c2.'));
  assert.ok(gate.reviewerCalibration.some((card) => card.expectedFinding.includes('Claim c2')));
});

test('evidence alignment rewards direct evidence, citations, and statistics', () => {
  const project = clone(sample);
  project.manuscript.claims[1].evidenceIds = ['e2'];
  project.manuscript.claims[1].citationIds = ['ref1'];
  project.manuscript.statistics.push({
    name: 'transit stop admissions reduction',
    pValue: 0.04,
    effectSize: -0.08,
    sampleSize: 70,
    claimIds: ['c2'],
  });

  const before = scoreEvidenceAlignment(sample);
  const after = scoreEvidenceAlignment(project);

  assert.ok(after.score > before.score);
  assert.equal(after.findings.find((finding) => finding.claimId === 'c2').issues.length, 0);
});

test('reproducibility scoring flags missing successful attempts', () => {
  const repro = scoreReproducibility(sample);

  assert.equal(repro.score, 84);
  assert.ok(repro.missingActions.includes('Link at least one successful reproducibility attempt.'));

  const project = clone(sample);
  project.reproducibility.previousAttempts.push({
    id: 'attempt-2026-05-08',
    status: 'passed',
  });

  assert.equal(scoreReproducibility(project).score, 100);
});

test('research gap ranking uses interests, capabilities, replication gaps, and negative results', () => {
  const gaps = rankResearchGaps(sample);

  assert.equal(gaps.topOpportunity.id, 'paper-a');
  assert.ok(gaps.topOpportunity.rationale.includes('high citation count with limited replication'));
  assert.ok(gaps.opportunities[0].score > gaps.opportunities[2].score);
});

test('report renderer includes decision, next actions, opportunities, and calibration cards', () => {
  const report = renderMarkdownReport(buildQualityGate(sample));

  assert.match(report, /Decision: hold/);
  assert.match(report, /Add direct evidence for claim c2/);
  assert.match(report, /Replication Gaps in Heat-Health Intervention Studies/);
  assert.match(report, /Reviewer Calibration/);
});

test('a complete project can pass the quality gate', () => {
  const project = clone(sample);
  project.manuscript.claims[1].text = 'Shaded transit stops were associated with lower admissions on observed hot days.';
  project.manuscript.claims[1].evidenceIds = ['e2'];
  project.manuscript.claims[1].citationIds = ['ref1'];
  project.manuscript.statistics.push({
    name: 'shaded stop admission association',
    pValue: 0.04,
    effectSize: -0.07,
    sampleSize: 78,
    claimIds: ['c2'],
  });
  project.reproducibility.previousAttempts.push({
    id: 'attempt-2026-05-08',
    status: 'passed',
  });

  const gate = buildQualityGate(project);

  assert.equal(gate.decision, 'ready');
  assert.ok(gate.readinessScore >= 82);
});
