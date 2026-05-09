export const researchObjects = [
  {
    id: "paper-organoid-response",
    type: "paper",
    title: "Predicting chemotherapy response from patient-derived organoids",
    domain: "oncology",
    year: 2026,
    institution: "SCIBASE Oncology Lab",
    citationCount: 42,
    reproducibilityScore: 94,
    text:
      "Alice Chen and Mateo Rivera use CRISPR controls, patient-derived tumor organoids, random forest models, PubMed references, DOI 10.5555/scibase.organoid.v1, and Python notebooks to study chemotherapy response."
  },
  {
    id: "dataset-growth-curves",
    type: "dataset",
    title: "Organoid growth curve dataset",
    domain: "oncology",
    year: 2025,
    institution: "Open Reproducibility Center",
    citationCount: 118,
    reproducibilityScore: 91,
    text:
      "Dataset reused by organoid chemotherapy studies. Includes dose response curves, TP53 mutation labels, PubChem compound identifiers, and DataCite DOI 10.5555/scibase.growth.v1."
  },
  {
    id: "protocol-crispr-qc",
    type: "protocol",
    title: "CRISPR quality-control protocol for organoid assays",
    domain: "methods",
    year: 2024,
    institution: "Neuroscience Methods Hub",
    citationCount: 67,
    reproducibilityScore: 88,
    text:
      "Protocol describes CRISPR controls, microscopy instruments, Scanpy clustering notebooks, UniProt gene annotations, and cross-lab quality control."
  },
  {
    id: "notebook-scanpy-clustering",
    type: "notebook",
    title: "Scanpy clustering notebook for resistant-cell states",
    domain: "neuroscience",
    year: 2026,
    institution: "Neuroscience Methods Hub",
    citationCount: 24,
    reproducibilityScore: 86,
    text:
      "Python notebook uses Scanpy, UMAP, TP53 pathway features, organoid-derived data, and unresolved questions about therapy-resistant cell states."
  }
];

const ontology = {
  concepts: ["CRISPR", "organoids", "chemotherapy", "random forest", "TP53", "UMAP", "dose response", "therapy-resistant cell states"],
  tools: ["Python", "Scanpy", "PubMed", "DataCite", "microscopy"],
  ontologies: ["MeSH", "UniProt", "PubChem", "Crossref"],
  funders: ["Open Science Accelerator", "Neuroscience Methods Hub"]
};

export function extractEntities(objects = researchObjects) {
  return objects.flatMap((object) => {
    const text = object.text.toLowerCase();
    const extracted = [
      entity(object.institution, "institution", object),
      ...extractAuthorEntities(object),
      ...Object.entries(ontology).flatMap(([group, values]) =>
        values
          .filter((value) => text.includes(value.toLowerCase()))
          .map((value) => entity(value, group === "tools" ? "tool" : group === "ontologies" ? "ontology" : group === "funders" ? "funder" : "concept", object))
      ),
      ...extractDoiEntities(object)
    ];
    return dedupe(extracted, (item) => `${item.id}:${item.sourceObjectId}`);
  });
}

export function buildGraph(objects = researchObjects) {
  const extracted = extractEntities(objects);
  const nodes = [
    ...objects.map((object) => ({
      id: object.id,
      label: object.title,
      type: object.type,
      domain: object.domain,
      institution: object.institution,
      year: object.year,
      citationCount: object.citationCount,
      reproducibilityScore: object.reproducibilityScore
    })),
    ...dedupe(
      extracted.map((item) => ({ id: item.id, label: item.label, type: item.type })),
      (node) => node.id
    )
  ];
  const edges = extracted.map((item) => ({
    id: `${item.sourceObjectId}->${item.id}`,
    source: item.sourceObjectId,
    target: item.id,
    relationship: item.relationship,
    context: item.context
  }));
  return { nodes, edges, schemaOrg: buildSchemaOrg(objects, extracted) };
}

export function queryGraph(query, filters = {}, graph = buildGraph()) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matchedNodes = graph.nodes.filter((node) => {
    const text = `${node.label} ${node.type} ${node.domain || ""} ${node.institution || ""}`.toLowerCase();
    const textMatch = terms.every((term) => text.includes(term));
    const filterMatch =
      (!filters.domain || node.domain === filters.domain) &&
      (!filters.type || node.type === filters.type) &&
      (!filters.institution || node.institution === filters.institution) &&
      (!filters.minReproducibility || (node.reproducibilityScore || 0) >= filters.minReproducibility);
    return textMatch && filterMatch;
  });
  const ids = new Set(matchedNodes.map((node) => node.id));
  const relatedEdges = graph.edges.filter((edge) => ids.has(edge.source) || ids.has(edge.target));
  const relatedNodeIds = new Set(relatedEdges.flatMap((edge) => [edge.source, edge.target]));
  return {
    query,
    filters,
    nodes: graph.nodes.filter((node) => relatedNodeIds.has(node.id) || ids.has(node.id)),
    edges: relatedEdges
  };
}

export function buildEntityPage(entityId, graph = buildGraph()) {
  const node = graph.nodes.find((item) => item.id === entityId);
  if (!node) throw new Error(`Unknown entity: ${entityId}`);
  const usageEdges = graph.edges.filter((edge) => edge.target === entityId || edge.source === entityId);
  const objectIds = new Set(usageEdges.map((edge) => (edge.source === entityId ? edge.target : edge.source)));
  const usageContexts = graph.nodes.filter((item) => objectIds.has(item.id));
  return {
    entity: node,
    citations: usageContexts.reduce((total, item) => total + (item.citationCount || 0), 0),
    usageContexts,
    relationships: usageEdges
  };
}

export function recommendResearch({ userInterests = ["organoids", "CRISPR"], recentObjectId = "paper-organoid-response" } = {}, graph = buildGraph()) {
  const recentEdges = graph.edges.filter((edge) => edge.source === recentObjectId || edge.target === recentObjectId);
  const connected = new Set(recentEdges.flatMap((edge) => [edge.source, edge.target]));
  return graph.nodes
    .filter((node) => node.id !== recentObjectId && node.type !== "author" && node.type !== "doi")
    .map((node) => {
      const interestScore = userInterests.filter((interest) => node.label.toLowerCase().includes(interest.toLowerCase())).length * 3;
      const graphScore = connected.has(node.id) ? 4 : 0;
      const trendScore = Math.min(3, (node.citationCount || 0) / 40);
      const reproducibilityScore = Math.min(3, (node.reproducibilityScore || 0) / 35);
      return {
        node,
        score: Number((interestScore + graphScore + trendScore + reproducibilityScore).toFixed(2)),
        reason: recommendationReason(node, graphScore, interestScore)
      };
    })
    .filter((item) => item.score > 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function buildDashboard() {
  const graph = buildGraph();
  return {
    graph,
    entityPage: buildEntityPage("concept-crispr", graph),
    navigation: {
      datasetCitations: queryGraph("dataset", { minReproducibility: 85 }, graph),
      crisprNeuroscience: queryGraph("CRISPR", { institution: "Neuroscience Methods Hub" }, graph),
      reusedNotebook: queryGraph("Scanpy", { type: "notebook" }, graph)
    },
    recommendations: recommendResearch(undefined, graph)
  };
}

function entity(label, type, object) {
  return {
    id: `${type}-${slug(label)}`,
    label,
    type,
    sourceObjectId: object.id,
    relationship: type === "doi" ? "cites" : type === "author" ? "authored_by" : "mentions",
    context: object.title
  };
}

function extractAuthorEntities(object) {
  return ["Alice Chen", "Mateo Rivera"].filter((name) => object.text.includes(name)).map((name) => entity(name, "author", object));
}

function extractDoiEntities(object) {
  const matches = object.text.match(/10\.\d{4,9}\/[A-Za-z0-9._/-]+/g) || [];
  return matches.map((doi) => entity(doi, "doi", object));
}

function buildSchemaOrg(objects, entities) {
  return objects.map((object) => ({
    "@context": "https://schema.org",
    "@type": object.type === "dataset" ? "Dataset" : "ScholarlyArticle",
    identifier: object.id,
    name: object.title,
    about: entities.filter((entityItem) => entityItem.sourceObjectId === object.id).map((item) => ({ "@type": "Thing", name: item.label }))
  }));
}

function recommendationReason(node, graphScore, interestScore) {
  if (graphScore > 0 && interestScore > 0) return "Directly connected to recent project activity and matches stated interests.";
  if (graphScore > 0) return "Connected through the current knowledge graph neighborhood.";
  if (interestScore > 0) return "Matches the researcher interest profile.";
  return "Strong citation and reproducibility signals make this a useful discovery candidate.";
}

function dedupe(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
