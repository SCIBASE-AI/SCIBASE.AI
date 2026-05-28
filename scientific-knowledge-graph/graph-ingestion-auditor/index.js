const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 33,
  high: 17,
  medium: 8,
  low: 3,
};

const REQUIRED_ENTITY_TYPES = ["paper", "author", "dataset", "method", "software", "concept"];

const IDENTIFIER_RULES = {
  paper: /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i,
  author: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/,
  dataset: /^(doi:10\.\d{4,9}\/.+|datacite:.+|zenodo:\d+)$/i,
  method: /^(mesh:.+|obo:.+|wikidata:Q\d+)$/i,
  software: /^(swh:1:.+|github:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|doi:10\.\d{4,9}\/.+)$/i,
  concept: /^(mesh:.+|pubchem:\d+|uniprot:[A-Z0-9]+|wikidata:Q\d+)$/i,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function entityKey(entity) {
  return `${entity.type}:${entity.id}`;
}

function verifyEntityCoverage(graph) {
  const findings = [];
  const types = new Set((graph.entities || []).map((entity) => entity.type));
  REQUIRED_ENTITY_TYPES.forEach((type) => {
    if (!types.has(type)) {
      findings.push(finding(
        type === "paper" || type === "author" ? "blocker" : "high",
        "REQUIRED_ENTITY_TYPE_MISSING",
        "Required knowledge graph entity type is missing",
        `${graph.projectId} has no extracted ${type} entities.`,
        `Add at least one reviewed ${type} entity before publishing this graph slice.`,
      ));
    }
  });
  return findings;
}

function verifyEntityIdentifiers(graph, policy) {
  const findings = [];
  const minConfidence = policy.minimumEntityConfidence || 0.78;

  (graph.entities || []).forEach((entity) => {
    if (!entity.label || !entity.type) {
      findings.push(finding(
        "blocker",
        "ENTITY_LABEL_OR_TYPE_MISSING",
        "Entity lacks a label or type",
        `${entity.id || "unknown"} has label=${entity.label || "missing"} type=${entity.type || "missing"}.`,
        "Require a label and typed extraction result before graph ingestion.",
      ));
    }

    if ((entity.confidence || 0) < minConfidence) {
      findings.push(finding(
        entity.type === "paper" || entity.type === "dataset" ? "high" : "medium",
        "ENTITY_CONFIDENCE_BELOW_THRESHOLD",
        "Extracted entity confidence is below threshold",
        `${entityKey(entity)} confidence=${entity.confidence || 0}, threshold=${minConfidence}.`,
        "Route the entity to human review or hide it from recommendations until verified.",
      ));
    }

    const rule = IDENTIFIER_RULES[entity.type];
    if (rule && !rule.test(entity.identifier || "")) {
      findings.push(finding(
        entity.type === "paper" || entity.type === "author" ? "high" : "medium",
        "ENTITY_IDENTIFIER_INVALID",
        "Entity identifier does not match the expected namespace",
        `${entityKey(entity)} identifier=${entity.identifier || "missing"}.`,
        "Normalize the entity to DOI, ORCID, DataCite, MeSH, PubChem, UniProt, Wikidata, SWH, or GitHub form.",
      ));
    }

    if (entity.visibility === "private" && !entity.privateProjectId) {
      findings.push(finding(
        "blocker",
        "PRIVATE_ENTITY_SCOPE_MISSING",
        "Private entity lacks a project scope",
        `${entityKey(entity)} is private without a privateProjectId.`,
        "Attach private graph nodes to a project scope or exclude them from shared graph exports.",
      ));
    }
  });

  return findings;
}

function verifyRelationships(graph, policy) {
  const findings = [];
  const minEvidence = policy.minimumRelationshipEvidence || 2;
  const knownEntities = new Set((graph.entities || []).map(entityKey));

  (graph.relationships || []).forEach((relationship) => {
    const source = `${relationship.sourceType}:${relationship.sourceId}`;
    const target = `${relationship.targetType}:${relationship.targetId}`;

    if (!knownEntities.has(source) || !knownEntities.has(target)) {
      findings.push(finding(
        "blocker",
        "RELATIONSHIP_ENDPOINT_MISSING",
        "Relationship references a missing entity",
        `${relationship.id} links ${source} -> ${target}, but at least one endpoint is absent.`,
        "Create the missing entity or remove the relationship before graph export.",
      ));
    }

    if (!relationship.provenance?.sourceDocumentId || !relationship.provenance?.extractorVersion) {
      findings.push(finding(
        "high",
        "RELATIONSHIP_PROVENANCE_MISSING",
        "Relationship lacks extraction provenance",
        `${relationship.id} has incomplete source document or extractor metadata.`,
        "Store source document, span, extractor version, and review state for every edge.",
      ));
    }

    if ((relationship.evidenceCount || 0) < minEvidence) {
      findings.push(finding(
        "medium",
        "RELATIONSHIP_EVIDENCE_WEAK",
        "Relationship has weak evidence support",
        `${relationship.id} has ${relationship.evidenceCount || 0} evidence items, below ${minEvidence}.`,
        "Require more evidence or mark the edge as tentative in graph navigation.",
      ));
    }

    if (relationship.visibility === "public" && relationship.sourcePrivateContent) {
      findings.push(finding(
        "blocker",
        "PRIVATE_CONTENT_EDGE_PUBLIC",
        "Public relationship is derived from private content",
        `${relationship.id} is public but cites private source content.`,
        "Downgrade the edge to private scope or re-extract it from public evidence.",
      ));
    }
  });

  return findings;
}

function verifyRecommendations(graph, policy) {
  const findings = [];
  const minRecommendationEvidence = policy.minimumRecommendationEvidence || 3;

  (graph.recommendations || []).forEach((recommendation) => {
    if ((recommendation.evidenceEdges || []).length < minRecommendationEvidence) {
      findings.push(finding(
        "high",
        "RECOMMENDATION_EVIDENCE_INSUFFICIENT",
        "AI recommendation lacks enough graph evidence",
        `${recommendation.id} has ${(recommendation.evidenceEdges || []).length} evidence edges.`,
        "Hide or label the recommendation until enough verified graph evidence supports it.",
      ));
    }

    if (recommendation.usesPrivateSignals && recommendation.visibility === "public") {
      findings.push(finding(
        "blocker",
        "PRIVATE_SIGNAL_IN_PUBLIC_RECOMMENDATION",
        "Public recommendation uses private user or project signals",
        `${recommendation.id} combines private signals with public visibility.`,
        "Keep private-signal recommendations in the user workspace only.",
      ));
    }
  });

  return findings;
}

function verifyExportReadiness(graph) {
  const findings = [];
  const exportConfig = graph.exportConfig || {};

  if (!exportConfig.format || !["jsonld", "rdf", "graphml"].includes(exportConfig.format)) {
    findings.push(finding(
      "medium",
      "GRAPH_EXPORT_FORMAT_UNSUPPORTED",
      "Graph export format is missing or unsupported",
      `${graph.projectId} export format=${exportConfig.format || "missing"}.`,
      "Choose jsonld, rdf, or graphml for downstream graph consumers.",
    ));
  }

  if (exportConfig.public && !exportConfig.license) {
    findings.push(finding(
      "high",
      "PUBLIC_GRAPH_LICENSE_MISSING",
      "Public graph export lacks a license",
      `${graph.projectId} is configured for public graph export without a license.`,
      "Set a graph metadata license before publishing reusable linked data.",
    ));
  }

  if (!exportConfig.schemaVersion) {
    findings.push(finding(
      "medium",
      "GRAPH_SCHEMA_VERSION_MISSING",
      "Graph export lacks a schema version",
      `${graph.projectId} has no schema version in exportConfig.`,
      "Pin a schema version so downstream consumers can validate graph payloads.",
    ));
  }

  return findings;
}

function auditKnowledgeGraph(graph, policy = {}) {
  const findings = [
    ...verifyEntityCoverage(graph),
    ...verifyEntityIdentifiers(graph, policy),
    ...verifyRelationships(graph, policy),
    ...verifyRecommendations(graph, policy),
    ...verifyExportReadiness(graph),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "block-graph-publication"
    : high
      ? "manual-graph-review"
      : findings.length
        ? "publish-with-graph-caveats"
        : "ready-for-graph-publication";

  const entityCounts = (graph.entities || []).reduce((counts, entity) => {
    counts[entity.type] = (counts[entity.type] || 0) + 1;
    return counts;
  }, {});

  const packet = {
    projectId: graph.projectId,
    reviewedAt: policy.reviewDate,
    decision,
    riskScore,
    entityCounts,
    relationshipCount: (graph.relationships || []).length,
    recommendationCount: (graph.recommendations || []).length,
    exportFormat: graph.exportConfig?.format || null,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-knowledge-graph-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Knowledge Graph Ingestion Audit",
    "",
    `Project: ${result.projectId}`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Relationships: ${result.relationshipCount}`,
    `Recommendations: ${result.recommendationCount}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Entity Counts",
  ];

  Object.keys(result.entityCounts)
    .sort()
    .forEach((type) => {
      lines.push(`- ${type}: ${result.entityCounts[type]}`);
    });

  lines.push("", "## Findings");
  if (!result.findings.length) {
    lines.push("- No knowledge graph ingestion issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic graph packet only; no private research content, user activity, live ontology services, credentials, or external APIs.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "block-graph-publication"
    ? "#b42318"
    : result.decision === "ready-for-graph-publication"
      ? "#067647"
      : "#b54708";
  const types = Object.keys(result.entityCounts).sort();
  const maxCount = Math.max(...types.map((type) => result.entityCounts[type]), 1);
  const bars = types.slice(0, 6).map((type, index) => {
    const y = 195 + index * 42;
    const width = Math.round(430 * result.entityCounts[type] / maxCount);
    return `<text x="36" y="${y}" font-family="Arial" font-size="17" fill="#344054">${escapeXml(type)}</text>
  <rect x="180" y="${y - 20}" width="430" height="24" rx="4" fill="#eaecf0"/>
  <rect x="180" y="${y - 20}" width="${width}" height="24" rx="4" fill="#12b76a"/>
  <text x="632" y="${y}" font-family="Arial" font-size="17" fill="#344054">${result.entityCounts[type]}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="460" viewBox="0 0 960 460" role="img" aria-label="Knowledge graph ingestion audit summary">
  <rect width="960" height="460" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="412" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Knowledge Graph Ingestion Audit</text>
  <rect x="36" y="98" width="410" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="476" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="428" font-family="Arial" font-size="18" fill="#667085">Synthetic graph packet only. No ontology or recommendation service calls.</text>
</svg>
`;
}

module.exports = {
  auditKnowledgeGraph,
  digest,
  entityKey,
  renderMarkdownReport,
  renderSvgSummary,
};
