"use strict";

const OUTCOME_WEIGHTS = Object.freeze({
  replicated: 1,
  partial: 0.35,
  inconclusive: -0.15,
  negative_result: -0.55,
  failed_replication: -1
});

const NODE_TYPES = Object.freeze({
  CLAIM: "claim",
  PAPER: "paper",
  DATASET: "dataset",
  PROTOCOL: "protocol",
  METHOD: "method",
  CONCEPT: "concept",
  REPLICATION_SIGNAL: "replication_signal"
});

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function addNode(nodes, node) {
  if (!node || !node.id) {
    throw new Error("Graph nodes require an id");
  }
  if (!nodes.has(node.id)) {
    nodes.set(node.id, { ...node });
    return;
  }

  const existing = nodes.get(node.id);
  nodes.set(node.id, {
    ...existing,
    ...node,
    aliases: unique([...(existing.aliases || []), ...(node.aliases || [])]),
    tags: unique([...(existing.tags || []), ...(node.tags || [])])
  });
}

function addEdge(edges, from, to, type, evidence = {}) {
  if (!from || !to) {
    throw new Error(`Cannot add ${type} edge without both endpoints`);
  }
  edges.push({
    id: `${from}:${type}:${to}:${edges.length + 1}`,
    from,
    to,
    type,
    evidence
  });
}

function normalizeOutcome(outcome) {
  const normalized = String(outcome || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!(normalized in OUTCOME_WEIGHTS)) {
    throw new Error(`Unsupported replication outcome: ${outcome}`);
  }
  return normalized;
}

function evidenceQuality(report) {
  const methodMatch = clamp(Number(report.methodMatch ?? 0.5));
  const sampleOverlap = clamp(Number(report.sampleOverlap ?? 0.5));
  const protocolAvailability = report.protocolAvailable === false ? 0.2 : 1;
  const independentLab = report.independentLab === false ? 0.7 : 1;
  const preregistered = report.preregistered ? 1.1 : 1;
  const confidence = clamp(Number(report.confidence ?? 0.5));

  return round(
    clamp(
      confidence *
        (0.35 + methodMatch * 0.25 + sampleOverlap * 0.25 + protocolAvailability * 0.1 + independentLab * 0.05) *
        preregistered,
      0,
      1
    )
  );
}

function signalStrength(report) {
  const outcome = normalizeOutcome(report.outcome);
  return round(OUTCOME_WEIGHTS[outcome] * evidenceQuality(report));
}

function claimReferenceScore(claim) {
  const citationScore = clamp(Math.log10(Number(claim.citations || 0) + 1) / 4);
  const reproducibilityScore = clamp(Number(claim.reproducibilityScore ?? 0.5));
  const publicationConfidence = clamp(Number(claim.publicationConfidence ?? 0.5));
  return round(citationScore * 0.2 + reproducibilityScore * 0.45 + publicationConfidence * 0.35);
}

function treatmentForScore(score, negativePressure) {
  if (negativePressure >= 0.55 || score < -0.25) {
    return "suppress_recommendation";
  }
  if (negativePressure >= 0.25 || score < 0.15) {
    return "show_with_replication_caution";
  }
  if (score >= 0.7) {
    return "promote_as_replicated";
  }
  return "show_with_evidence_context";
}

function summarizeClaim(claim, reports) {
  const referenceScore = claimReferenceScore(claim);
  const signals = reports.map((report) => ({
    id: report.id,
    outcome: normalizeOutcome(report.outcome),
    strength: signalStrength(report),
    quality: evidenceQuality(report),
    lab: report.lab,
    reportedAt: report.reportedAt
  }));

  const positiveSupport = round(signals.filter((s) => s.strength > 0).reduce((sum, s) => sum + s.strength, 0));
  const negativePressure = round(Math.abs(signals.filter((s) => s.strength < 0).reduce((sum, s) => sum + s.strength, 0)));
  const netScore = round(clamp(referenceScore + positiveSupport * 0.45 - negativePressure * 0.85, -1, 1), 3);
  const hasInconclusiveEvidence = signals.some((signal) => signal.outcome === "inconclusive");
  let treatment = treatmentForScore(netScore, negativePressure);
  if (hasInconclusiveEvidence && treatment === "show_with_evidence_context") {
    treatment = "show_with_replication_caution";
  }

  const requiredActions = [];
  if (negativePressure >= 0.55) {
    requiredActions.push("open_curator_review");
    requiredActions.push("attach_failed_replication_to_entity_page");
  }
  if (hasInconclusiveEvidence) {
    requiredActions.push("request_method_detail_before_digesting");
  }
  if (signals.length === 0) {
    requiredActions.push("label_unreplicated_claim");
  }
  if (treatment === "suppress_recommendation") {
    requiredActions.push("remove_from_ai_recommendation_digest");
  }

  return {
    claimId: claim.id,
    title: claim.title,
    domain: claim.domain,
    referenceScore,
    positiveSupport,
    negativePressure,
    netScore,
    treatment,
    signals,
    requiredActions: unique(requiredActions)
  };
}

function buildReplicationSignalGraph(input) {
  const data = input || {};
  assertArray(data.claims, "claims");
  assertArray(data.replicationReports, "replicationReports");

  const nodes = new Map();
  const edges = [];

  for (const concept of data.concepts || []) {
    addNode(nodes, { ...concept, type: NODE_TYPES.CONCEPT });
  }
  for (const method of data.methods || []) {
    addNode(nodes, { ...method, type: NODE_TYPES.METHOD });
  }
  for (const paper of data.papers || []) {
    addNode(nodes, { ...paper, type: NODE_TYPES.PAPER });
  }
  for (const dataset of data.datasets || []) {
    addNode(nodes, { ...dataset, type: NODE_TYPES.DATASET });
  }
  for (const protocol of data.protocols || []) {
    addNode(nodes, { ...protocol, type: NODE_TYPES.PROTOCOL });
  }

  const reportsByClaim = new Map();
  for (const report of data.replicationReports) {
    const outcome = normalizeOutcome(report.outcome);
    const signalId = `signal:${report.id}`;
    addNode(nodes, {
      id: signalId,
      type: NODE_TYPES.REPLICATION_SIGNAL,
      title: report.title || `${outcome} for ${report.claimId}`,
      outcome,
      lab: report.lab,
      reportedAt: report.reportedAt,
      quality: evidenceQuality(report),
      strength: signalStrength(report),
      tags: ["replication", outcome]
    });
    addEdge(edges, signalId, report.claimId, "evaluates_claim", {
      outcome,
      quality: evidenceQuality(report),
      strength: signalStrength(report)
    });
    if (report.datasetId) addEdge(edges, signalId, report.datasetId, "uses_dataset");
    if (report.protocolId) addEdge(edges, signalId, report.protocolId, "uses_protocol");
    if (report.methodId) addEdge(edges, signalId, report.methodId, "uses_method");

    if (!reportsByClaim.has(report.claimId)) reportsByClaim.set(report.claimId, []);
    reportsByClaim.get(report.claimId).push(report);
  }

  const claimSummaries = [];
  for (const claim of data.claims) {
    addNode(nodes, {
      ...claim,
      type: NODE_TYPES.CLAIM,
      tags: unique(["claim", claim.domain, ...(claim.tags || [])])
    });
    if (claim.paperId) addEdge(edges, claim.paperId, claim.id, "asserts_claim");
    for (const conceptId of claim.conceptIds || []) addEdge(edges, claim.id, conceptId, "mentions_concept");
    for (const methodId of claim.methodIds || []) addEdge(edges, claim.id, methodId, "uses_method");
    for (const datasetId of claim.datasetIds || []) addEdge(edges, claim.id, datasetId, "uses_dataset");
    claimSummaries.push(summarizeClaim(claim, reportsByClaim.get(claim.id) || []));
  }

  const publicationBiasAlerts = buildPublicationBiasAlerts(data.claims, claimSummaries);
  const recommendationDigest = claimSummaries
    .slice()
    .sort((a, b) => b.netScore - a.netScore)
    .map((summary) => ({
      claimId: summary.claimId,
      title: summary.title,
      treatment: summary.treatment,
      netScore: summary.netScore,
      rationale:
        summary.negativePressure > 0
          ? `${summary.negativePressure} negative replication pressure; ${summary.positiveSupport} positive support`
          : `${summary.positiveSupport} positive replication support; no negative signal`
    }));

  return {
    generatedAt: new Date().toISOString(),
    nodes: [...nodes.values()],
    edges,
    claimSummaries,
    publicationBiasAlerts,
    recommendationDigest,
    stats: {
      nodeCount: nodes.size,
      edgeCount: edges.length,
      claimCount: data.claims.length,
      replicationSignalCount: data.replicationReports.length,
      suppressedRecommendations: claimSummaries.filter((s) => s.treatment === "suppress_recommendation").length,
      cautionRecommendations: claimSummaries.filter((s) => s.treatment === "show_with_replication_caution").length
    }
  };
}

function buildPublicationBiasAlerts(claims, summaries) {
  const byDomain = new Map();
  for (const claim of claims) {
    if (!byDomain.has(claim.domain)) byDomain.set(claim.domain, []);
    byDomain.get(claim.domain).push(claim.id);
  }
  const summaryByClaim = new Map(summaries.map((summary) => [summary.claimId, summary]));
  const alerts = [];
  for (const [domain, claimIds] of byDomain.entries()) {
    const domainSummaries = claimIds.map((id) => summaryByClaim.get(id));
    const unreplicatedHighConfidence = domainSummaries.filter(
      (summary) => summary.referenceScore >= 0.6 && summary.signals.length === 0
    );
    const negativeSignals = domainSummaries.filter((summary) => summary.negativePressure > 0);
    if (unreplicatedHighConfidence.length > 0 && negativeSignals.length === 0) {
      alerts.push({
        domain,
        severity: "medium",
        reason: "High-confidence claims have no registered negative or failed replication records.",
        claimIds: unreplicatedHighConfidence.map((summary) => summary.claimId),
        action: "prompt_reviewers_to_register_null_results"
      });
    }
  }
  return alerts;
}

function queryGraph(graph, options = {}) {
  const domain = options.domain;
  const treatment = options.treatment;
  const minimumScore = options.minimumScore ?? -1;
  const results = graph.claimSummaries.filter((summary) => {
    if (domain && summary.domain !== domain) return false;
    if (treatment && summary.treatment !== treatment) return false;
    return summary.netScore >= minimumScore;
  });
  return {
    count: results.length,
    results
  };
}

function createEntityPage(graph, claimId) {
  const summary = graph.claimSummaries.find((item) => item.claimId === claimId);
  if (!summary) throw new Error(`Unknown claim: ${claimId}`);
  const claim = graph.nodes.find((node) => node.id === claimId);
  const relatedEdges = graph.edges.filter((edge) => edge.from === claimId || edge.to === claimId);
  const signalNodes = summary.signals.map((signal) => graph.nodes.find((node) => node.id === `signal:${signal.id}`));
  return {
    id: claimId,
    title: summary.title,
    type: "ScientificClaim",
    domain: summary.domain,
    treatment: summary.treatment,
    replicationScore: summary.netScore,
    requiredActions: summary.requiredActions,
    relationships: relatedEdges,
    replicationSignals: signalNodes,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      identifier: claimId,
      headline: claim.title,
      about: claim.conceptIds || [],
      isBasedOn: claim.datasetIds || [],
      measurementTechnique: claim.methodIds || [],
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "SCIBASE replication treatment",
          value: summary.treatment
        },
        {
          "@type": "PropertyValue",
          name: "SCIBASE replication score",
          value: summary.netScore
        }
      ]
    }
  };
}

function renderGraphSvg(graph) {
  const width = 900;
  const rowHeight = 92;
  const height = 120 + graph.claimSummaries.length * rowHeight;
  const rows = graph.claimSummaries
    .map((summary, index) => {
      const y = 90 + index * rowHeight;
      const color =
        summary.treatment === "suppress_recommendation"
          ? "#b42318"
          : summary.treatment === "show_with_replication_caution"
            ? "#b54708"
            : summary.treatment === "promote_as_replicated"
              ? "#027a48"
              : "#175cd3";
      const barWidth = Math.round((summary.netScore + 1) * 180);
      return [
        `<g transform="translate(40 ${y})">`,
        `<rect x="0" y="0" width="820" height="72" rx="8" fill="#ffffff" stroke="#d0d5dd"/>`,
        `<text x="18" y="26" font-family="Arial" font-size="17" fill="#101828">${escapeXml(summary.title)}</text>`,
        `<text x="18" y="52" font-family="Arial" font-size="12" fill="#475467">${escapeXml(summary.treatment)} | positive ${summary.positiveSupport} | negative ${summary.negativePressure}</text>`,
        `<rect x="560" y="24" width="360" height="16" rx="8" fill="#f2f4f7" transform="scale(.8 1)"/>`,
        `<rect x="560" y="24" width="${barWidth}" height="16" rx="8" fill="${color}" transform="scale(.8 1)"/>`,
        `<text x="745" y="36" font-family="Arial" font-size="12" fill="#101828">score ${summary.netScore}</text>`,
        `</g>`
      ].join("");
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f8fafc"/>`,
    `<text x="40" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#101828">Negative Evidence Replication Graph</text>`,
    `<text x="40" y="66" font-family="Arial" font-size="14" fill="#475467">Failed replications and null results become graph signals before recommendations are shown.</text>`,
    rows,
    `</svg>`
  ].join("");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  NODE_TYPES,
  OUTCOME_WEIGHTS,
  buildReplicationSignalGraph,
  createEntityPage,
  evidenceQuality,
  queryGraph,
  renderGraphSvg,
  signalStrength,
  summarizeClaim
};
