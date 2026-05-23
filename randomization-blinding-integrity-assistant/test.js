const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateRandomizationBlindingIntegrity,
  buildReviewerPacket,
} = require('./index');

test('holds studies that lack sequence evidence and allocation concealment', () => {
  const result = evaluateRandomizationBlindingIntegrity({
    manuscriptId: 'ms-hidden-allocation-risk',
    generatedAt: '2026-05-23T06:00:00Z',
    studies: [
      {
        id: 'trial-microbiome-01',
        design: 'parallel clinical trial',
        arms: [
          {id: 'control', enrolled: 42},
          {id: 'probiotic', enrolled: 41},
        ],
        randomization: {
          sequenceEvidence: false,
          method: '',
          allocationConcealment: false,
          stratificationFactors: ['site'],
        },
        blinding: {
          participant: true,
          careProvider: true,
          outcomeAssessor: true,
          analyst: true,
          armLabelExposure: [],
          unblindingEvents: [],
        },
        exclusions: [],
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-review');
  assert.equal(result.summary.studyCount, 1);
  assert.equal(result.summary.randomizationIssues, 2);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-randomization-sequence', 'missing-allocation-concealment']
  );
  assert.equal(result.requiredActions[0].type, 'attach_randomization_sequence');
});

test('requires author response for unblinding, arm-label leakage, and post-randomization exclusions', () => {
  const result = evaluateRandomizationBlindingIntegrity({
    manuscriptId: 'ms-unblinded-analysis',
    generatedAt: '2026-05-23T06:00:00Z',
    studies: [
      {
        id: 'animal-stroke-02',
        design: 'preclinical animal experiment',
        arms: [
          {id: 'sham', enrolled: 18},
          {id: 'treatment', enrolled: 18},
        ],
        randomization: {
          sequenceEvidence: true,
          method: 'blocked randomization',
          allocationConcealment: true,
          stratificationFactors: ['sex', 'baseline-score'],
        },
        blinding: {
          participant: false,
          careProvider: false,
          outcomeAssessor: true,
          analyst: false,
          armLabelExposure: [
            {artifact: 'analysis-notebook.ipynb', label: 'treatment arm names visible before primary analysis'},
          ],
          unblindingEvents: [
            {role: 'analyst', occurredAt: '2026-04-11', beforePrimaryEndpointLock: true},
          ],
        },
        exclusions: [
          {participantId: 'rat-17', afterRandomization: true, reason: 'outlier response', blindedDecision: false},
        ],
      },
    ],
  });

  assert.equal(result.decision, 'needs-author-response');
  assert.equal(result.summary.blindingIssues, 3);
  assert.equal(result.summary.exclusionIssues, 1);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-blinding-role', 'arm-label-leakage', 'early-unblinding-event', 'unblinded-post-randomization-exclusion']
  );
  assert.equal(result.requiredActions.at(-1).type, 'justify_unblinded_exclusion');
});

test('flags stratification imbalance without blocking complete blinded packets', () => {
  const result = evaluateRandomizationBlindingIntegrity({
    manuscriptId: 'ms-imbalance-review',
    generatedAt: '2026-05-23T06:00:00Z',
    studies: [
      {
        id: 'trial-cardiology-03',
        design: 'multicenter randomized trial',
        arms: [
          {id: 'standard-care', enrolled: 33, strata: {siteA: 30, siteB: 3}},
          {id: 'new-device', enrolled: 45, strata: {siteA: 20, siteB: 25}},
        ],
        randomization: {
          sequenceEvidence: true,
          method: 'permuted blocks',
          allocationConcealment: true,
          stratificationFactors: ['site'],
          maxArmImbalancePercent: 20,
        },
        blinding: {
          participant: true,
          careProvider: true,
          outcomeAssessor: true,
          analyst: true,
          armLabelExposure: [],
          unblindingEvents: [],
        },
        exclusions: [],
      },
    ],
  });

  assert.equal(result.decision, 'needs-author-response');
  assert.equal(result.summary.balanceIssues, 1);
  assert.equal(result.findings[0].type, 'arm-size-imbalance');
  assert.equal(result.requiredActions[0].type, 'explain_randomization_imbalance');
});

test('approves complete integrity packets and builds deterministic reviewer report', () => {
  const result = evaluateRandomizationBlindingIntegrity({
    manuscriptId: 'ms-ready-randomized-study',
    generatedAt: '2026-05-23T06:00:00Z',
    studies: [
      {
        id: 'trial-oncology-04',
        design: 'double-blind randomized trial',
        arms: [
          {id: 'placebo', enrolled: 120, strata: {siteA: 60, siteB: 60}},
          {id: 'therapy', enrolled: 118, strata: {siteA: 59, siteB: 59}},
        ],
        randomization: {
          sequenceEvidence: true,
          method: 'centralized permuted blocks',
          allocationConcealment: true,
          stratificationFactors: ['site', 'disease-stage'],
          maxArmImbalancePercent: 10,
        },
        blinding: {
          participant: true,
          careProvider: true,
          outcomeAssessor: true,
          analyst: true,
          armLabelExposure: [],
          unblindingEvents: [],
        },
        exclusions: [
          {participantId: 'p-099', afterRandomization: true, reason: 'withdrew consent', blindedDecision: true},
        ],
      },
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.readinessScore, 100);
  assert.equal(result.findings.length, 0);

  const packet = buildReviewerPacket(result);
  assert.match(packet, /# Randomization Blinding Integrity Assistant Report/);
  assert.match(packet, /Manuscript: ms-ready-randomized-study/);
  assert.match(packet, /Decision: approved/);
  assert.match(packet, /Readiness score: 100/);
  assert.match(packet, /Findings: 0/);
});
