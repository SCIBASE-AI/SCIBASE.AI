const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateAssayControlCalibration,
  buildReviewerPacket,
} = require('./index');

test('holds assays with missing positive, negative, and blank controls', () => {
  const result = evaluateAssayControlCalibration({
    manuscriptId: 'ms-missing-controls',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'elisa-cytokine-panel',
        name: 'Inflammatory cytokine ELISA',
        type: 'immunoassay',
        requiredControls: ['positive', 'negative', 'blank', 'vehicle'],
        controls: [
          {type: 'vehicle', id: 'vehicle-dmso', status: 'pass'},
        ],
        calibration: {
          curveId: 'std-il6-plate-7',
          rSquared: 0.998,
          standards: 8,
          acceptedRange: [0.99, 1],
          driftPercent: 3.1,
          maxDriftPercent: 5,
        },
        qcReplicates: [
          {id: 'qc-low', coefficientOfVariation: 0.08, maxCoefficientOfVariation: 0.15},
        ],
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-review');
  assert.equal(result.summary.assayCount, 1);
  assert.equal(result.summary.missingControls, 3);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-control', 'missing-control', 'missing-control']
  );
  assert.equal(result.requiredActions[0].type, 'attach_control_evidence');
});

test('requires author response for calibration drift and weak standard curves', () => {
  const result = evaluateAssayControlCalibration({
    manuscriptId: 'ms-calibration-drift',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'lcms-metabolomics',
        name: 'LC-MS metabolomics panel',
        type: 'analytical-chemistry',
        requiredControls: ['positive', 'negative', 'blank'],
        controls: [
          {type: 'positive', id: 'nist-mix', status: 'pass'},
          {type: 'negative', id: 'matrix-negative', status: 'pass'},
          {type: 'blank', id: 'solvent-blank', status: 'pass'},
        ],
        calibration: {
          curveId: 'std-curve-lcms-4',
          rSquared: 0.982,
          standards: 4,
          acceptedRange: [0.995, 1],
          driftPercent: 8.4,
          maxDriftPercent: 5,
        },
        qcReplicates: [
          {id: 'qc-mid', coefficientOfVariation: 0.12, maxCoefficientOfVariation: 0.15},
        ],
      },
    ],
  });

  assert.equal(result.decision, 'needs-author-response');
  assert.equal(result.summary.calibrationIssues, 2);
  assert.equal(result.findings[0].type, 'weak-calibration-fit');
  assert.equal(result.findings[1].type, 'calibration-drift');
  assert.equal(result.requiredActions[1].type, 'rerun_or_explain_calibration');
});

test('flags failed controls and high replicate variation as major findings', () => {
  const result = evaluateAssayControlCalibration({
    manuscriptId: 'ms-qc-variation',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'cell-viability-assay',
        name: 'Cell viability luminescence assay',
        type: 'wet-lab',
        requiredControls: ['positive', 'negative', 'vehicle'],
        controls: [
          {type: 'positive', id: 'staurosporine', status: 'fail'},
          {type: 'negative', id: 'untreated', status: 'pass'},
          {type: 'vehicle', id: 'dmso', status: 'pass'},
        ],
        calibration: {
          curveId: 'luminescence-cal-2',
          rSquared: 0.996,
          standards: 6,
          acceptedRange: [0.99, 1],
          driftPercent: 1.2,
          maxDriftPercent: 5,
        },
        qcReplicates: [
          {id: 'qc-high', coefficientOfVariation: 0.22, maxCoefficientOfVariation: 0.15},
        ],
      },
    ],
  });

  assert.equal(result.decision, 'needs-author-response');
  assert.equal(result.summary.failedControls, 1);
  assert.equal(result.summary.qcIssues, 1);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['failed-control', 'high-qc-variation']
  );
});

test('approves complete assay packets and builds deterministic reviewer packet', () => {
  const result = evaluateAssayControlCalibration({
    manuscriptId: 'ms-ready-assay-packet',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'qpcr-expression',
        name: 'qPCR expression assay',
        type: 'molecular-biology',
        instrument: {id: 'quantstudio-5', version: '1.7.2', lastCalibrationAt: '2026-04-20'},
        requiredControls: ['positive', 'negative', 'no-template'],
        controls: [
          {type: 'positive', id: 'validated-reference-cdna', status: 'pass'},
          {type: 'negative', id: 'healthy-control', status: 'pass'},
          {type: 'no-template', id: 'ntc-water', status: 'pass'},
        ],
        calibration: {
          curveId: 'qpcr-std-11',
          rSquared: 0.997,
          standards: 7,
          acceptedRange: [0.99, 1],
          driftPercent: 1.6,
          maxDriftPercent: 5,
        },
        qcReplicates: [
          {id: 'qc-low', coefficientOfVariation: 0.04, maxCoefficientOfVariation: 0.12},
          {id: 'qc-high', coefficientOfVariation: 0.07, maxCoefficientOfVariation: 0.12},
        ],
      },
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.readinessScore, 100);
  assert.equal(result.findings.length, 0);

  const packet = buildReviewerPacket(result);
  assert.match(packet, /# Assay Control Calibration Assistant Report/);
  assert.match(packet, /Manuscript: ms-ready-assay-packet/);
  assert.match(packet, /Decision: approved/);
  assert.match(packet, /Readiness score: 100/);
  assert.match(packet, /Findings: 0/);
});
