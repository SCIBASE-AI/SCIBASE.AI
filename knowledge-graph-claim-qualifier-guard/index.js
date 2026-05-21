const fs = require("fs");
const path = require("path");

const DEFAULT_POLICY = {
  causalPredicates: ["causes", "drives", "increases", "decreases", "inhibits", "activates", "prevents"],
  associationTerms: ["associated with", "correlates with", "linked to", "observed with", "co-occurs with"],
  negativeTerms: ["no significant", "not associated", "failed to reproduce", "did not improve", "null result", "inconclusive"],
  experimentalEvidenceTypes: ["randomized_trial", "controlled_experiment", "mechanistic_assay", "replication_success"],
  requiredContextFields: ["species", "assay", "dataset"]
};

function text(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function issue(kind, severity, edgeId, message, evidence = {}) {
  return { kind, severity, edgeId, message, evidence };
}

function includesAny(value, terms) {
  const normalized = lower(value);
  return terms.filter((term) => normalized.includes(lower(term)));
}

function isCausalPredicate(predicate, policy) {
  return policy.causalPredicates.includes(lower(predicate));
}

function hasExperimentalEvidence(edge, policy) {
  return policy.experimentalEvidenceTypes.includes(lower(edge.evidenceType));
}

function missingContext(edge, policy) {
  const context = edge.context || {};
  return policy.requiredContextFields.filter((field) => !text(context[field]));
}

function evaluateEdge(edge, policy) {
  const id = edge.id || "edge";
  const evidenceSentence = text(edge.evidenceSentence);
  const recommendationText = text(edge.recommendationText);
  const predicate = lower(edge.predicate);
  const qualifier = lower(edge.qualifier || edge.claimQualifier);
  const blockers = [];
  const warnings = [];

  const associationHits = includesAny(evidenceSentence, policy.associationTerms);
  if (isCausalPredicate(predicate, policy) && associationHits.length && !hasExperimentalEvidence(edge, policy)) {
    blockers.push(
      issue("causal_overclaim_from_association", "blocker", id, "Associational evidence cannot publish as a causal graph edge.", {
        predicate,
        evidenceType: edge.evidenceType,
        associationHits
      })
    );
  }

  const negativeHits = includesAny(evidenceSentence, policy.negativeTerms);
  if (negativeHits.length && !["negative", "null", "inconclusive"].includes(qualifier)) {
    blockers.push(
      issue("missing_negative_result_polarity", "blocker", id, "Negative or inconclusive evidence needs explicit graph-edge polarity.", {
        negativeHits,
        qualifier: edge.qualifier || null
      })
    );
  }

  if (isCausalPredicate(predicate, policy) && !hasExperimentalEvidence(edge, policy)) {
    warnings.push(
      issue("causal_edge_without_experimental_evidence", "warning", id, "Causal-looking edge should be downgraded or curator-reviewed without experimental evidence.", {
        predicate,
        evidenceType: edge.evidenceType
      })
    );
  }

  const missing = missingContext(edge, policy);
  if (missing.length) {
    warnings.push(
      issue("missing_experimental_context", "warning", id, "Graph edge is missing context needed for entity pages and recommendation filters.", {
        missing
      })
    );
  }

  if (
    recommendationText &&
    includesAny(recommendationText, ["use this to prove", "will cause", "guarantees", "definitively"]).length &&
    !hasExperimentalEvidence(edge, policy)
  ) {
    blockers.push(
      issue("unsupported_recommendation_language", "blocker", id, "Recommendation text is stronger than the linked evidence supports.", {
        recommendationText
      })
    );
  }

  return {
    id,
    subject: edge.subject,
    predicate: edge.predicate,
    object: edge.object,
    qualifier: edge.qualifier || null,
    evidenceType: edge.evidenceType,
    blockers,
    warnings,
    publishable: blockers.length === 0
  };
}

function evaluateClaimQualifiers(packet, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...(packet.policy || {}), ...policyOverrides };
  const edges = Array.isArray(packet.edges) ? packet.edges : [];
  const decisions = edges.map((edge) => evaluateEdge(edge, policy));
  const blockers = decisions.flatMap((decision) => decision.blockers);
  const warnings = decisions.flatMap((decision) => decision.warnings);
  const heldEdges = decisions.filter((decision) => !decision.publishable).map((decision) => decision.id);
  const publishableEdges = decisions.filter((decision) => decision.publishable).map((decision) => decision.id);

  return {
    graphId: packet.graphId || "scientific-knowledge-graph",
    generatedAt: packet.generatedAt || new Date().toISOString(),
    status: blockers.length ? "hold_claim_edges" : warnings.length ? "curator_review_recommended" : "graph_edges_ready",
    summary: {
      edgesChecked: edges.length,
      blockers: blockers.length,
      warnings: warnings.length,
      heldEdges: heldEdges.length,
      publishableEdges: publishableEdges.length
    },
    curatorPacket: {
      blockers,
      warnings,
      heldEdges,
      publishableEdges,
      recommendation: blockers.length
        ? "Hold unsafe graph edges and downgrade or qualify claims before publication."
        : warnings.length
          ? "Publish after curator confirms context qualifiers."
          : "Publish graph edges and allow recommendation use."
    },
    decisions
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMarkdownReport(result) {
  const lines = [
    "# Knowledge Graph Claim Qualifier Guard Report",
    "",
    `Graph: ${result.graphId}`,
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Edges checked: ${result.summary.edgesChecked}`,
    `- Blockers: ${result.summary.blockers}`,
    `- Warnings: ${result.summary.warnings}`,
    `- Held edges: ${result.summary.heldEdges}`,
    `- Publishable edges: ${result.summary.publishableEdges}`,
    "",
    "## Recommendation",
    "",
    result.curatorPacket.recommendation,
    "",
    "## Blockers",
    ""
  ];

  if (!result.curatorPacket.blockers.length) {
    lines.push("- None");
  } else {
    for (const blocker of result.curatorPacket.blockers) {
      lines.push(`- ${blocker.edgeId}: ${blocker.kind} - ${blocker.message}`);
    }
  }

  lines.push("", "## Edge Decisions", "");
  for (const decision of result.decisions) {
    lines.push(`- ${decision.id}: ${decision.subject} ${decision.predicate} ${decision.object} -> ${decision.publishable ? "publish" : "hold"}`);
  }

  return `${lines.join("\n")}\n`;
}

function buildSvgSummary(result) {
  const statusColor = result.status === "graph_edges_ready" ? "#1f8f5f" : result.status === "curator_review_recommended" ? "#b26b00" : "#b42318";
  const bars = [
    ["Edges", result.summary.edgesChecked, "#2563eb"],
    ["Blockers", result.summary.blockers, "#b42318"],
    ["Warnings", result.summary.warnings, "#b26b00"],
    ["Held", result.summary.heldEdges, "#7c3aed"],
    ["Publishable", result.summary.publishableEdges, "#0f766e"]
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar[1]));
  const rows = bars
    .map(([label, value, color], index) => {
      const y = 180 + index * 54;
      const width = Math.max(8, Math.round((value / maxValue) * 520));
      return `
        <text x="72" y="${y + 23}" font-size="22" fill="#18202f">${escapeXml(label)}</text>
        <rect x="220" y="${y}" width="560" height="30" rx="6" fill="#edf2f7"/>
        <rect x="220" y="${y}" width="${width}" height="30" rx="6" fill="${color}"/>
        <text x="805" y="${y + 23}" font-size="22" fill="#18202f">${value}</text>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="16" fill="#ffffff" stroke="#d8dee8"/>
  <text x="72" y="104" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#101828">Knowledge Graph Claim Qualifier Guard</text>
  <text x="72" y="144" font-family="Arial, sans-serif" font-size="22" fill="#475467">Curator packet for ${escapeXml(result.graphId)}</text>
  <rect x="870" y="82" width="300" height="48" rx="10" fill="${statusColor}"/>
  <text x="892" y="114" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(result.status)}</text>
  <g font-family="Arial, sans-serif">${rows}</g>
  <text x="72" y="520" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#101828">Publication decision</text>
  <text x="72" y="560" font-family="Arial, sans-serif" font-size="22" fill="#344054">${escapeXml(result.curatorPacket.recommendation)}</text>
  <text x="72" y="625" font-family="Arial, sans-serif" font-size="18" fill="#667085">Synthetic data only. Dependency-free local demo.</text>
</svg>
`;
}

function writeReportBundle(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "claim-qualifier-packet.json");
  const markdownPath = path.join(outputDir, "claim-qualifier-report.md");
  const svgPath = path.join(outputDir, "summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(result));
  fs.writeFileSync(svgPath, buildSvgSummary(result));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  DEFAULT_POLICY,
  evaluateClaimQualifiers,
  buildMarkdownReport,
  buildSvgSummary,
  writeReportBundle
};
