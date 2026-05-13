export const NODE_TYPES = ["concept", "author", "institution", "tool", "dataset", "protocol", "funder", "doi", "project"];

const DICTIONARY = {
  concept: ["CRISPR", "organoids", "single-cell RNA-seq", "resistant tumor states", "quality-control"],
  author: ["Alina Chen", "Mateo Ruiz"],
  institution: ["Northbridge University", "Open Organoid Consortium"],
  tool: ["Scanpy", "Snakemake"],
  dataset: ["GSE-ORGANOID-42"],
  protocol: ["PROTO-CRISPR-7"],
  funder: ["BIO-2026-114"],
  doi: ["10.0000/organoid.atlas"]
};

const normalizeId = (type, value) => `${type}:${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

export function extractEntities(object) {
  const entities = [];
  for (const [type, values] of Object.entries(DICTIONARY)) {
    for (const value of values) {
      if (object.text.toLowerCase().includes(value.toLowerCase())) {
        entities.push({
          id: normalizeId(type, value),
          type,
          label: value,
          sourceObjectId: object.id,
          domain: object.domain,
          institution: object.institution,
          citations: object.citations,
          reproducibilityScore: object.reproducibilityScore,
          evidence: object.text.slice(Math.max(0, object.text.toLowerCase().indexOf(value.toLowerCase()) - 40), object.text.toLowerCase().indexOf(value.toLowerCase()) + value.length + 40)
        });
      }
    }
  }
  entities.push({
    id: `project:${object.id}`,
    type: "project",
    label: object.id,
    sourceObjectId: object.id,
    domain: object.domain,
    institution: object.institution,
    citations: object.citations,
    reproducibilityScore: object.reproducibilityScore,
    evidence: object.text.slice(0, 140)
  });
  return entities;
}

export function buildKnowledgeGraph(objects) {
  const nodesById = new Map();
  const edges = [];
  for (const object of objects) {
    const entities = extractEntities(object);
    for (const entity of entities) {
      const existing = nodesById.get(entity.id);
      if (existing) {
        existing.contexts.push(entity.sourceObjectId);
        existing.citations = Math.max(existing.citations, entity.citations);
        existing.reproducibilityScore = Math.max(existing.reproducibilityScore, entity.reproducibilityScore);
      } else {
        nodesById.set(entity.id, { ...entity, contexts: [entity.sourceObjectId] });
      }
    }
    const projectNode = `project:${object.id}`;
    for (const entity of entities.filter((item) => item.type !== "project")) {
      edges.push({
        id: `${projectNode}->${entity.id}`,
        from: projectNode,
        to: entity.id,
        relation: entity.type === "doi" ? "cites" : entity.type === "dataset" ? "uses-dataset" : entity.type === "protocol" ? "uses-protocol" : "mentions",
        evidence: entity.evidence,
        sourceObjectId: object.id
      });
    }
  }
  return { nodes: [...nodesById.values()], edges };
}

export function searchGraph(graph, filters = {}) {
  return graph.nodes
    .filter((node) => (filters.type ? node.type === filters.type : true))
    .filter((node) => (filters.domain ? node.domain === filters.domain : true))
    .filter((node) => (filters.institution ? node.institution === filters.institution : true))
    .filter((node) => (filters.minCitations ? node.citations >= filters.minCitations : true))
    .filter((node) => (filters.minReproducibility ? node.reproducibilityScore >= filters.minReproducibility : true));
}

export function buildEntityPage(graph, entityId) {
  const node = graph.nodes.find((item) => item.id === entityId);
  if (!node) throw new Error(`Unknown entity: ${entityId}`);
  const connectedEdges = graph.edges.filter((edge) => edge.from === entityId || edge.to === entityId);
  const connectedNodeIds = new Set(connectedEdges.flatMap((edge) => [edge.from, edge.to]).filter((id) => id !== entityId));
  return {
    entity: node,
    contexts: node.contexts,
    connectedEntities: graph.nodes.filter((item) => connectedNodeIds.has(item.id)).map((item) => ({ id: item.id, label: item.label, type: item.type })),
    evidence: connectedEdges.map((edge) => ({ relation: edge.relation, evidence: edge.evidence, sourceObjectId: edge.sourceObjectId }))
  };
}

function interestScore(node, profile) {
  const label = node.label.toLowerCase();
  const interestHits = profile.interests.filter((interest) => label.includes(interest.toLowerCase()) || interest.toLowerCase().includes(label)).length;
  const historyHits = node.contexts.filter((context) => profile.projectHistory.includes(context)).length;
  const institutionBonus = node.institution === profile.institution ? 1 : 0;
  return interestHits * 30 + historyHits * 12 + institutionBonus * 8 + Math.min(25, Math.round(node.citations / 8)) + Math.round(node.reproducibilityScore / 10);
}

export function buildRecommendations(graph, profile) {
  return graph.nodes
    .filter((node) => node.type !== "project")
    .map((node) => ({
      entityId: node.id,
      label: node.label,
      type: node.type,
      score: interestScore(node, profile),
      reason:
        node.type === "dataset"
          ? "Dataset reused by projects in your history."
          : node.type === "tool"
            ? "Tool co-occurs with your recent methods."
            : node.type === "concept"
              ? "Concept overlaps your research interests."
              : "Connected to your active scientific graph.",
      surface: node.type === "concept" ? "discovery-mode" : node.type === "dataset" ? "project-sidebar" : "weekly-digest"
    }))
    .sort((a, b) => b.score - a.score);
}

export function buildJsonLdExport(graph) {
  return {
    "@context": "https://schema.org",
    "@graph": graph.nodes.map((node) => ({
      "@id": node.id,
      "@type": node.type === "project" ? "CreativeWork" : node.type === "dataset" ? "Dataset" : "Thing",
      name: node.label,
      keywords: [node.type, node.domain],
      citation: node.type === "doi" ? node.label : undefined,
      isPartOf: node.contexts
    }))
  };
}

export function buildGraphDashboard(objects, profile) {
  const graph = buildKnowledgeGraph(objects);
  return {
    graph,
    highReproducibilityEntities: searchGraph(graph, { minReproducibility: 85 }),
    recommendations: buildRecommendations(graph, profile).slice(0, 6),
    jsonLd: buildJsonLdExport(graph),
    summary: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      nodeTypes: [...new Set(graph.nodes.map((node) => node.type))].sort()
    }
  };
}
