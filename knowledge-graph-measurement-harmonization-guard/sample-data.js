const sampleGraph = {
  graphId: 'kg-cardio-measurement-review',
  policy: {
    minimumEvidenceConfidence: 0.75,
  },
  measurements: [
    {
      measurementId: 'rat-pressure-mmhg',
      endpoint: 'systolic_pressure',
      value: 120,
      unit: 'mmHg',
      statistic: 'mean',
      context: { species: 'rat', tissue: 'artery', assayContext: 'ex-vivo' },
    },
    {
      measurementId: 'rat-pressure-pa',
      endpoint: 'systolic_pressure',
      value: 15999,
      unit: 'Pa',
      statistic: 'mean',
      context: { species: 'rat', tissue: 'artery', assayContext: 'ex-vivo' },
    },
    {
      measurementId: 'human-pressure-pa',
      endpoint: 'systolic_pressure',
      value: 15999,
      unit: 'Pa',
      statistic: 'mean',
      context: { species: 'human', tissue: 'artery', assayContext: 'ex-vivo' },
    },
    {
      measurementId: 'glucose-mgdl',
      endpoint: 'glucose_concentration',
      value: 95,
      unit: 'mg/dL',
      statistic: 'mean',
      context: { species: 'mouse', tissue: 'serum', assayContext: 'fasted' },
    },
    {
      measurementId: 'glucose-rfu',
      endpoint: 'glucose_concentration',
      value: 4200,
      unit: 'RFU',
      statistic: 'mean',
      context: { species: 'mouse', tissue: 'serum', assayContext: 'fasted' },
    },
    {
      measurementId: 'yield-mean',
      endpoint: 'reaction_yield',
      value: 81,
      unit: 'percent',
      statistic: 'mean',
      context: { species: 'n/a', tissue: 'catalyst-bed', assayContext: 'bench' },
    },
    {
      measurementId: 'yield-median',
      endpoint: 'reaction_yield',
      value: 79,
      unit: 'percent',
      statistic: 'median',
      context: { species: 'n/a', tissue: 'catalyst-bed', assayContext: 'bench' },
    },
  ],
  candidateEdges: [
    {
      edgeId: 'edge-rat-pressure-pa',
      sourceMeasurementId: 'rat-pressure-mmhg',
      targetMeasurementId: 'rat-pressure-pa',
      evidenceConfidence: 0.94,
    },
    {
      edgeId: 'edge-rat-human-pressure',
      sourceMeasurementId: 'rat-pressure-mmhg',
      targetMeasurementId: 'human-pressure-pa',
      evidenceConfidence: 0.92,
    },
    {
      edgeId: 'edge-glucose-rfu',
      sourceMeasurementId: 'glucose-mgdl',
      targetMeasurementId: 'glucose-rfu',
      evidenceConfidence: 0.81,
    },
    {
      edgeId: 'edge-mean-vs-median',
      sourceMeasurementId: 'yield-mean',
      targetMeasurementId: 'yield-median',
      evidenceConfidence: 0.85,
    },
    {
      edgeId: 'edge-low-provenance',
      sourceMeasurementId: 'rat-pressure-mmhg',
      targetMeasurementId: 'rat-pressure-pa',
      evidenceConfidence: 0.42,
    },
  ],
};

const harmonizedGraph = {
  graphId: 'kg-ready-pressure-review',
  policy: {
    minimumEvidenceConfidence: 0.75,
  },
  measurements: [
    {
      measurementId: 'pressure-a',
      endpoint: 'systolic_pressure',
      value: 118,
      unit: 'mmHg',
      statistic: 'mean',
      context: { species: 'rat', tissue: 'artery', assayContext: 'ex-vivo' },
    },
    {
      measurementId: 'pressure-b',
      endpoint: 'systolic_pressure',
      value: 15730,
      unit: 'Pa',
      statistic: 'mean',
      context: { species: 'rat', tissue: 'artery', assayContext: 'ex-vivo' },
    },
  ],
  candidateEdges: [
    {
      edgeId: 'edge-ready-pressure',
      sourceMeasurementId: 'pressure-a',
      targetMeasurementId: 'pressure-b',
      evidenceConfidence: 0.91,
    },
  ],
};

module.exports = {
  sampleGraph,
  harmonizedGraph,
};
