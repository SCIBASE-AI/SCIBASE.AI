const scenarios = [
  {
    name: 'missing-required-controls',
    manuscriptId: 'ms-missing-controls',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'elisa-cytokine-panel',
        name: 'Inflammatory cytokine ELISA',
        type: 'immunoassay',
        instrument: {id: 'plate-reader-a2', version: '3.4.1', lastCalibrationAt: '2026-04-28'},
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
  },
  {
    name: 'calibration-drift-response',
    manuscriptId: 'ms-calibration-drift',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'lcms-metabolomics',
        name: 'LC-MS metabolomics panel',
        type: 'analytical-chemistry',
        instrument: {id: 'orbitrap-qe-3', version: '5.1.0', lastCalibrationAt: '2026-01-11'},
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
  },
  {
    name: 'failed-control-and-qc-variation',
    manuscriptId: 'ms-qc-variation',
    generatedAt: '2026-05-23T02:00:00Z',
    assays: [
      {
        id: 'cell-viability-assay',
        name: 'Cell viability luminescence assay',
        type: 'wet-lab',
        instrument: {id: 'luminometer-9', version: '2.8.0', lastCalibrationAt: '2026-05-01'},
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
  },
  {
    name: 'ready-assay-packet',
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
  },
];

module.exports = {scenarios};
