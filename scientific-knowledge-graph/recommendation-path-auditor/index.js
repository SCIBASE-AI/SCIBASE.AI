"use strict";

const crypto = require("crypto");

const WEIGHTS = {
  critical: 26,
  high: 18,
  medium: 10,
  low: 5,
};

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    PRIVATE_NODE_LEAK: "Remove private or embargoed graph nodes from recommendations and digest payloads.",
    EXPLANATION_PATH_BROKEN: "Regenerate the recommendation path from existing graph edges before surfacing it.",
    FILTER_VIOLATION: "Apply user domain, institution, date, and reproducibility filters before ranking.",
    RETRACTED_SOURCE_USED: "Suppress recommendations whose path depends on retracted or blocked citations.",
    WEAK_EVIDENCE_SCORE: "Require stronger citation, reuse, or co-occurrence evidence for this suggestion.",
    STALE_TREND_SIGNAL: "Refresh trend features before using the recommendation in a weekly digest.",
    DUPLICATE_RECOMMENDATION: "Deduplicate equivalent target nodes across workspace sidebar and email digest.",
    MISSING_SCHEMA_METADATA: "Attach schema.org-compatible entity metadata before publishing the node.",
    UNEXPLAINED_PERSONALIZATION: "Store the user-facing reason and feature weights for personalized recommendations.",
  };
  return recommendations[code] || "Route this recommendation for knowledge-graph review.";
}

function auditRecommendations(graphPacket, options = {}) {
  const now = new Date(options.now || graphPacket.auditTime || new Date().toISOString());
  const nodes = new Map((graphPacket.nodes || []).map((node) => [node.id, node]));
  const edgeIndex = buildEdgeIndex(graphPacket.edges || []);
  const findings = [];
  const seenTargets = new Map();

  for (const item of graphPacket.recommendations || []) {
    const target = nodes.get(item.targetNodeId);

    if (seenTargets.has(item.targetNodeId)) {
      addFinding(findings, {
        code: "DUPLICATE_RECOMMENDATION",
        severity: "low",
        recommendationId: item.id,
        message: `${item.id} duplicates target from ${seenTargets.get(item.targetNodeId)}.`,
        evidence: item,
      });
    } else {
      seenTargets.set(item.targetNodeId, item.id);
    }

    if (!target) {
      addFinding(findings, {
        code: "EXPLANATION_PATH_BROKEN",
        severity: "critical",
        recommendationId: item.id,
        message: `${item.id} points to missing target node ${item.targetNodeId}.`,
        evidence: item,
      });
      continue;
    }

    const pathNodes = (item.explanationPath || []).map((id) => nodes.get(id)).filter(Boolean);
    const privateNodes = pathNodes.concat(target).filter((node) => node.visibility === "private" || node.embargoed);
    if (privateNodes.length) {
      addFinding(findings, {
        code: "PRIVATE_NODE_LEAK",
        severity: "critical",
        recommendationId: item.id,
        message: `${item.id} exposes private or embargoed nodes: ${privateNodes.map((node) => node.id).join(", ")}.`,
        evidence: privateNodes,
      });
    }

    if (!pathExists(item.explanationPath || [], edgeIndex)) {
      addFinding(findings, {
        code: "EXPLANATION_PATH_BROKEN",
        severity: "high",
        recommendationId: item.id,
        message: `${item.id} explanation path cannot be reconstructed from graph edges.`,
        evidence: item.explanationPath,
      });
    }

    if (!passesFilters(target, item.appliedFilters || {}, graphPacket.userContext || {})) {
      addFinding(findings, {
        code: "FILTER_VIOLATION",
        severity: "high",
        recommendationId: item.id,
        message: `${item.id} target ${target.id} violates applied user filters.`,
        evidence: { target, filters: item.appliedFilters, userContext: graphPacket.userContext },
      });
    }

    const pathEdges = edgesForPath(item.explanationPath || [], edgeIndex);
    const retractedEdges = pathEdges.filter((edge) => edge.retracted || edge.blocked);
    if (retractedEdges.length) {
      addFinding(findings, {
        code: "RETRACTED_SOURCE_USED",
        severity: "critical",
        recommendationId: item.id,
        message: `${item.id} depends on retracted or blocked evidence edges.`,
        evidence: retractedEdges,
      });
    }

    const evidenceScore = computeEvidenceScore(pathEdges, item);
    if (evidenceScore < (graphPacket.policy?.minEvidenceScore || 55)) {
      addFinding(findings, {
        code: "WEAK_EVIDENCE_SCORE",
        severity: "medium",
        recommendationId: item.id,
        message: `${item.id} evidence score ${evidenceScore} is below policy minimum.`,
        evidence: { evidenceScore, policyMinimum: graphPacket.policy?.minEvidenceScore || 55 },
      });
    }

    if (daysBetween(item.trendFeaturesUpdatedAt, now.toISOString()) > (graphPacket.policy?.maxTrendAgeDays || 14)) {
      addFinding(findings, {
        code: "STALE_TREND_SIGNAL",
        severity: "medium",
        recommendationId: item.id,
        message: `${item.id} uses trend features ${daysBetween(item.trendFeaturesUpdatedAt, now.toISOString())} days old.`,
        evidence: item.trendFeaturesUpdatedAt,
      });
    }

    if (!target.schemaOrgType || !target.canonicalName || !target.sourceIds?.length) {
      addFinding(findings, {
        code: "MISSING_SCHEMA_METADATA",
        severity: "medium",
        recommendationId: item.id,
        nodeId: target.id,
        message: `${target.id} is missing schema.org-compatible metadata.`,
        evidence: target,
      });
    }

    if (!item.userFacingReason || !item.featureWeights || Object.keys(item.featureWeights).length === 0) {
      addFinding(findings, {
        code: "UNEXPLAINED_PERSONALIZATION",
        severity: "high",
        recommendationId: item.id,
        message: `${item.id} lacks explainable personalization details.`,
        evidence: item,
      });
    }
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision = riskScore >= 70 ? "hold-recommendations" : riskScore >= 35 ? "repair-graph-ranking" : "recommendation-ready";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.recommendationId, finding.nodeId]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    graph: {
      id: graphPacket.id,
      title: graphPacket.title,
      userId: graphPacket.userContext?.userId,
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      nodesReviewed: (graphPacket.nodes || []).length,
      edgesReviewed: (graphPacket.edges || []).length,
      recommendationsReviewed: (graphPacket.recommendations || []).length,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
    },
    findings,
    recommendationGates: [
      { gate: "Recommendation paths do not leak private or embargoed nodes.", passed: !findings.some((finding) => finding.code === "PRIVATE_NODE_LEAK") },
      { gate: "Every explanation path is reconstructable from graph edges.", passed: !findings.some((finding) => finding.code === "EXPLANATION_PATH_BROKEN") },
      { gate: "Applied filters are enforced before ranking.", passed: !findings.some((finding) => finding.code === "FILTER_VIOLATION") },
      { gate: "No recommendation depends on retracted or blocked evidence.", passed: !findings.some((finding) => finding.code === "RETRACTED_SOURCE_USED") },
      { gate: "Personalized suggestions include user-facing reasons and feature weights.", passed: !findings.some((finding) => finding.code === "UNEXPLAINED_PERSONALIZATION") },
    ],
  };
}

function buildEdgeIndex(edges) {
  const index = new Map();
  for (const edge of edges) {
    index.set(`${edge.from}->${edge.to}`, edge);
    if (!edge.directed) index.set(`${edge.to}->${edge.from}`, edge);
  }
  return index;
}

function pathExists(path, edgeIndex) {
  if (!Array.isArray(path) || path.length < 2) return false;
  for (let index = 0; index < path.length - 1; index += 1) {
    if (!edgeIndex.has(`${path[index]}->${path[index + 1]}`)) return false;
  }
  return true;
}

function edgesForPath(path, edgeIndex) {
  const edges = [];
  if (!Array.isArray(path)) return edges;
  for (let index = 0; index < path.length - 1; index += 1) {
    const edge = edgeIndex.get(`${path[index]}->${path[index + 1]}`);
    if (edge) edges.push(edge);
  }
  return edges;
}

function passesFilters(target, filters, userContext) {
  if (filters.domain && target.domain && filters.domain !== target.domain) return false;
  if (filters.minReproducibilityScore && (target.reproducibilityScore || 0) < filters.minReproducibilityScore) return false;
  if (filters.institutionOnly && target.institution && target.institution !== userContext.institution) return false;
  if (filters.afterYear && target.year && target.year < filters.afterYear) return false;
  return true;
}

function computeEvidenceScore(edges, item) {
  const edgeScore = edges.reduce((sum, edge) => sum + (edge.weight || 0) * (edge.citations || 1), 0);
  const featureScore = Object.values(item.featureWeights || {}).reduce((sum, value) => sum + Number(value || 0), 0) * 10;
  return Math.round(edgeScore + featureScore);
}

function daysBetween(leftIso, rightIso) {
  return Math.round((new Date(rightIso).getTime() - new Date(leftIso).getTime()) / 86400000);
}

function renderMarkdownReport(report) {
  const lines = [
    `# Recommendation Path Audit: ${report.graph.title}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Nodes reviewed: ${report.summary.nodesReviewed}`,
    `- Edges reviewed: ${report.summary.edgesReviewed}`,
    `- Recommendations reviewed: ${report.summary.recommendationsReviewed}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}${finding.recommendationId ? ` (${finding.recommendationId})` : ""}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Recommendation Gates", "");
  for (const gate of report.recommendationGates) {
    lines.push(`- [${gate.passed ? "x" : "!"}] ${gate.gate}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  auditRecommendations,
  renderMarkdownReport,
  buildEdgeIndex,
  pathExists,
  computeEvidenceScore,
  daysBetween,
};
