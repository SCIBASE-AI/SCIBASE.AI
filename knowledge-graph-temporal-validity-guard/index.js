const crypto = require('node:crypto');

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
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
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function makeFinding(code, severity, targetType, targetId, message, evidence = {}) {
  return {code, severity, targetType, targetId, message, evidence};
}

function isExpired(record, asOfDate) {
  const until = parseDate(record.validUntil);
  return Boolean(until && until < asOfDate);
}

function isFuture(record, asOfDate) {
  const from = parseDate(record.validFrom);
  return Boolean(from && from > asOfDate);
}

function analyzeTemporalGraph(graph) {
  const asOfDate = parseDate(graph.asOf);
  if (!asOfDate) {
    throw new Error('graph.asOf must be a valid YYYY-MM-DD date');
  }

  const nodes = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const edges = new Map((graph.edges || []).map((edge) => [edge.id, edge]));
  const findings = [];

  for (const node of nodes.values()) {
    if (isFuture(node, asOfDate)) {
      findings.push(makeFinding(
        'NODE_NOT_YET_EFFECTIVE',
        'blocker',
        'node',
        node.id,
        `Node ${node.id} is not effective on ${graph.asOf}.`,
        {validFrom: node.validFrom},
      ));
    }
    if (isExpired(node, asOfDate)) {
      findings.push(makeFinding(
        'NODE_EXPIRED',
        'blocker',
        'node',
        node.id,
        `Node ${node.id} expired before ${graph.asOf}.`,
        {validUntil: node.validUntil},
      ));
    }
  }

  for (const edge of edges.values()) {
    const target = nodes.get(edge.to);
    const expired = isExpired(edge, asOfDate);
    const future = isFuture(edge, asOfDate);
    if (future) {
      findings.push(makeFinding(
        'EDGE_NOT_YET_EFFECTIVE',
        'blocker',
        'edge',
        edge.id,
        `Edge ${edge.id} is not effective on ${graph.asOf}.`,
        {validFrom: edge.validFrom},
      ));
    }
    if (expired) {
      if (edge.type === 'affiliated-with') {
        findings.push(makeFinding(
          'AFFILIATION_EXPIRED',
          'review',
          'edge',
          edge.id,
          `Affiliation edge ${edge.id} expired and needs curator review.`,
          {validUntil: edge.validUntil},
        ));
      } else {
        findings.push(makeFinding(
          'EDGE_EXPIRED',
          'blocker',
          'edge',
          edge.id,
          `Edge ${edge.id} expired before ${graph.asOf}.`,
          {validUntil: edge.validUntil},
        ));
      }
    }
    if (target && edge.evidenceVersion && target.version && edge.evidenceVersion !== target.version) {
      findings.push(makeFinding(
        'EVIDENCE_VERSION_DRIFT',
        'blocker',
        'edge',
        edge.id,
        `Edge ${edge.id} cites ${edge.evidenceVersion}, but target ${target.id} is ${target.version}.`,
        {edgeVersion: edge.evidenceVersion, targetVersion: target.version, targetId: target.id},
      ));
    }
  }

  const blockingTargets = new Set(
    findings
      .filter((finding) => finding.severity === 'blocker')
      .map((finding) => `${finding.targetType}:${finding.targetId}`),
  );

  const recommendationDecisions = (graph.recommendations || []).map((recommendation) => {
    const reasons = [];
    for (const nodeId of recommendation.path || []) {
      if (blockingTargets.has(`node:${nodeId}`)) reasons.push(`NODE_BLOCKED:${nodeId}`);
    }
    for (const edgeId of recommendation.edgeIds || []) {
      if (blockingTargets.has(`edge:${edgeId}`)) reasons.push(`EDGE_BLOCKED:${edgeId}`);
    }
    return {
      id: recommendation.id,
      title: recommendation.title,
      decision: reasons.length ? 'suppress' : 'publish',
      reasons,
    };
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const reviewItems = findings.filter((finding) => finding.severity === 'review').length;
  const status = blockers ? 'hold_temporal_review' : (reviewItems ? 'needs_curator_review' : 'temporal_ready');
  const summary = {
    blockers,
    reviewItems,
    nodeFindings: findings.filter((finding) => finding.targetType === 'node').length,
    edgeFindings: findings.filter((finding) => finding.targetType === 'edge').length,
    versionDrift: findings.filter((finding) => finding.code === 'EVIDENCE_VERSION_DRIFT').length,
    suppressedRecommendations: recommendationDecisions.filter((item) => item.decision === 'suppress').length,
  };

  return {
    graphId: graph.graphId,
    asOf: graph.asOf,
    status,
    summary,
    findings,
    recommendationDecisions,
    curatorActions: buildCuratorActions(findings),
    digest: digest({
      graphId: graph.graphId,
      asOf: graph.asOf,
      findings,
      recommendationDecisions,
    }),
  };
}

function buildCuratorActions(findings) {
  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === 'NODE_EXPIRED') actions.add('Retire expired nodes from public entity pages or map them to a current version.');
    if (finding.code === 'NODE_NOT_YET_EFFECTIVE') actions.add('Keep future-dated nodes hidden until their effective date.');
    if (finding.code === 'EDGE_EXPIRED') actions.add('Remove or replace expired relationship edges before graph recommendation release.');
    if (finding.code === 'EDGE_NOT_YET_EFFECTIVE') actions.add('Delay relationship publication until the effective date.');
    if (finding.code === 'AFFILIATION_EXPIRED') actions.add('Route expired affiliations to curator review before profile/entity-page display.');
    if (finding.code === 'EVIDENCE_VERSION_DRIFT') actions.add('Refresh relationship evidence to match the current target node or dataset version.');
  }
  return [...actions];
}

module.exports = {
  analyzeTemporalGraph,
};
