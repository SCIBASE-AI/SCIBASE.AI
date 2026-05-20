const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function normalizeMeasurement(measurement) {
  if (measurement.endpoint.includes('pressure')) {
    if (measurement.unit === 'mmHg') {
      return {
        normalizedValue: round2(measurement.value * 133.322),
        normalizedUnit: 'Pa',
        conversion: 'mmHg_to_Pa',
      };
    }
    if (measurement.unit === 'kPa') {
      return {
        normalizedValue: round2(measurement.value * 1000),
        normalizedUnit: 'Pa',
        conversion: 'kPa_to_Pa',
      };
    }
    if (measurement.unit === 'Pa') {
      return {
        normalizedValue: round2(measurement.value),
        normalizedUnit: 'Pa',
        conversion: 'identity',
      };
    }
  }

  if (measurement.endpoint.includes('glucose')) {
    if (measurement.unit === 'mg/dL') {
      return {
        normalizedValue: round2(measurement.value * 0.0555),
        normalizedUnit: 'mmol/L',
        conversion: 'mg_dL_to_mmol_L',
      };
    }
    if (measurement.unit === 'mmol/L') {
      return {
        normalizedValue: round2(measurement.value),
        normalizedUnit: 'mmol/L',
        conversion: 'identity',
      };
    }
  }

  if (measurement.unit === 'percent' || measurement.unit === 'ratio') {
    return {
      normalizedValue: round2(measurement.value),
      normalizedUnit: measurement.unit,
      conversion: 'identity',
    };
  }

  return {
    normalizedValue: null,
    normalizedUnit: null,
    conversion: 'unsupported',
  };
}

function addFinding(findings, edge, code, evidence, curatorAction) {
  findings.push({
    edgeId: edge.edgeId,
    code,
    severity: 'blocker',
    evidence,
    curatorAction,
  });
}

function evaluateEdge(edge, measurementsById, graph) {
  const source = measurementsById.get(edge.sourceMeasurementId);
  const target = measurementsById.get(edge.targetMeasurementId);
  const findings = [];
  const normalizedSource = normalizeMeasurement(source);
  const normalizedTarget = normalizeMeasurement(target);

  if (!normalizedSource.normalizedUnit || !normalizedTarget.normalizedUnit || normalizedSource.normalizedUnit !== normalizedTarget.normalizedUnit) {
    addFinding(
      findings,
      edge,
      'unit_not_convertible',
      `${source.unit} cannot be safely compared with ${target.unit} for ${source.endpoint}.`,
      'Add an ontology-backed conversion or mark the relationship as non-comparable.',
    );
  }

  const contextFields = ['species', 'tissue', 'assayContext'];
  const mismatchedContext = contextFields.filter((field) => source.context[field] !== target.context[field]);
  if (mismatchedContext.length > 0) {
    addFinding(
      findings,
      edge,
      'biological_context_mismatch',
      `Context mismatch in ${mismatchedContext.join(', ')}.`,
      'Split the graph edge or add a cross-context translation model before recommending reuse.',
    );
  }

  if (source.statistic !== target.statistic) {
    addFinding(
      findings,
      edge,
      'statistical_endpoint_mismatch',
      `${source.statistic} cannot be compared directly with ${target.statistic}.`,
      'Normalize the statistical endpoint or require curator approval for the comparison.',
    );
  }

  if (edge.evidenceConfidence < graph.policy.minimumEvidenceConfidence) {
    addFinding(
      findings,
      edge,
      'provenance_confidence_low',
      `Evidence confidence ${edge.evidenceConfidence} is below ${graph.policy.minimumEvidenceConfidence}.`,
      'Attach DOI, protocol, or dataset provenance before surfacing this recommendation.',
    );
  }

  return {
    decision: {
      edgeId: edge.edgeId,
      sourceMeasurementId: source.measurementId,
      targetMeasurementId: target.measurementId,
      decision: findings.length > 0 ? 'suppress_recommendation' : 'allow_comparison',
      normalizedSource,
      normalizedTarget,
    },
    findings,
  };
}

function evaluateMeasurementHarmonization(graph) {
  const measurementsById = new Map(graph.measurements.map((measurement) => [measurement.measurementId, measurement]));
  const edgeDecisions = [];
  const findings = [];

  for (const edge of graph.candidateEdges) {
    const result = evaluateEdge(edge, measurementsById, graph);
    edgeDecisions.push(result.decision);
    findings.push(...result.findings);
  }

  const sortedFindings = findings.sort((left, right) => left.code.localeCompare(right.code));

  return {
    graphId: graph.graphId,
    overallStatus: sortedFindings.length > 0 ? 'curation_required' : 'ready',
    summary: {
      measurementsReviewed: graph.measurements.length,
      edgesReviewed: graph.candidateEdges.length,
      blockingFindings: sortedFindings.length,
      allowedComparisons: edgeDecisions.filter((edge) => edge.decision === 'allow_comparison').length,
    },
    edgeDecisions,
    findings: sortedFindings,
  };
}

function buildGraphHarmonizationPacket(graph) {
  const review = evaluateMeasurementHarmonization(graph);
  const packet = {
    packetType: 'knowledge-graph-measurement-harmonization-guard',
    graphId: review.graphId,
    overallStatus: review.overallStatus,
    edgeDecisions: review.edgeDecisions,
    findings: review.findings,
    curatorActions: review.findings.map((finding) => ({
      edgeId: finding.edgeId,
      action: finding.curatorAction,
      evidence: finding.evidence,
    })),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MeasurementHarmonizationReview',
      identifier: review.graphId,
      reviewStatus: review.overallStatus,
      measurementCount: review.summary.measurementsReviewed,
      edgeCount: review.summary.edgesReviewed,
    },
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

module.exports = {
  evaluateMeasurementHarmonization,
  buildGraphHarmonizationPacket,
  normalizeMeasurement,
  stableStringify,
  digest,
};
