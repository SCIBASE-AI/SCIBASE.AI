import corpus from "../data/sample-corpus.json" with { type: "json" };

const DOI_PATTERN = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/gi;

const TYPE_LABELS = {
  paper: "ScholarlyArticle",
  dataset: "Dataset",
  notebook: "SoftwareSourceCode",
  protocol: "HowTo",
  concept: "DefinedTerm",
  author: "Person",
  institution: "Organization",
  tool: "SoftwareApplication",
  doi: "CreativeWork",
  ontology: "DefinedTerm"
};

export function loadSampleCorpus() {
  return structuredClone(corpus);
}

export function createKnowledgeGraph(documents = loadSampleCorpus()) {
  const nodes = new Map();
  const edges = [];

  for (const document of documents) {
    addNode(nodes, {
      id: document.id,
      type: document.kind,
      label: document.title,
      domain: document.domain,
      citationCount: document.citationCount ?? 0,
      reproducibilityScore: document.reproducibilityScore ?? 0,
      source: "research-object",
      schemaType: TYPE_LABELS[document.kind] ?? "CreativeWork"
    });

    const extracted = extractScientificEntities(document);
    connectDocumentEntities(nodes, edges, document, extracted);
  }

  addCoOccurrenceEdges(edges, documents);

  const graph = {
    generatedAt: new Date("2026-05-13T00:00:00.000Z").toISOString(),
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: uniqueEdges(edges),
    stats: {}
  };

  graph.stats = summarizeGraph(graph);
  graph.entityPages = buildEntityPages(graph, documents);
  graph.schemaOrg = buildSchemaOrg(graph, documents);
  return graph;
}

export function extractScientificEntities(document) {
  const text = `${document.title} ${document.abstract}`.toLowerCase();
  const explicitConcepts = document.concepts ?? [];
  const explicitTools = document.tools ?? [];
  const doiMatches = [...`${document.title} ${document.abstract}`.matchAll(DOI_PATTERN)].map((match) => match[0]);

  return {
    concepts: uniqueValues(explicitConcepts.filter((term) => text.includes(term.toLowerCase()))),
    authors: uniqueValues(document.authors ?? []),
    institutions: uniqueValues(document.affiliations ?? []),
    tools: uniqueValues(explicitTools.filter((tool) => text.includes(tool.toLowerCase()) || explicitTools.includes(tool))),
    datasets: uniqueValues(document.datasets ?? []),
    protocols: uniqueValues(document.protocols ?? []),
    dois: uniqueValues(doiMatches),
    ontologies: uniqueValues(document.ontologyTerms ?? [])
  };
}

export function queryGraph(graph, options = {}) {
  const {
    q = "",
    type,
    domain,
    minReproducibility = 0,
    seedEntityId
  } = options;

  const query = q.trim().toLowerCase();
  const relatedIds = seedEntityId ? neighborhood(graph, seedEntityId) : null;

  const nodes = graph.nodes.filter((node) => {
    const matchesText = !query || [node.label, node.id, node.domain, node.type].join(" ").toLowerCase().includes(query);
    const matchesType = !type || node.type === type;
    const matchesDomain = !domain || node.domain === domain || node.domains?.includes(domain);
    const matchesRepro = (node.reproducibilityScore ?? 1) >= minReproducibility;
    const matchesSeed = !relatedIds || relatedIds.has(node.id);
    return matchesText && matchesType && matchesDomain && matchesRepro && matchesSeed;
  });

  const selected = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target));
  return { nodes, edges, total: nodes.length };
}

export function buildEntityPages(graph, documents = loadSampleCorpus()) {
  const pages = {};
  for (const node of graph.nodes) {
    if (node.source === "research-object") continue;
    const adjacent = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
    const sourceDocumentIds = adjacent
      .map((edge) => edge.source === node.id ? edge.target : edge.source)
      .filter((id) => documents.some((document) => document.id === id));

    const sourceDocuments = documents.filter((document) => sourceDocumentIds.includes(document.id));
    pages[node.id] = {
      id: node.id,
      label: node.label,
      type: node.type,
      schemaType: node.schemaType,
      citationReach: sum(sourceDocuments.map((document) => document.citationCount ?? 0)),
      domains: uniqueValues(sourceDocuments.map((document) => document.domain)),
      usageContexts: sourceDocuments.map((document) => ({
        documentId: document.id,
        title: document.title,
        kind: document.kind,
        domain: document.domain,
        reproducibilityScore: document.reproducibilityScore
      })),
      relationships: adjacent.map((edge) => ({
        predicate: edge.predicate,
        source: edge.source,
        target: edge.target
      }))
    };
  }
  return pages;
}

export function recommendResearch(graph, profile = {}) {
  const interests = new Set((profile.interests ?? ["CRISPR", "reproducibility", "knowledge graph"]).map((term) => term.toLowerCase()));
  const recent = new Set(profile.recentEntityIds ?? ["concept-crispr", "concept-reproducibility"]);

  return graph.nodes
    .filter((node) => ["concept", "dataset", "protocol", "tool"].includes(node.type))
    .map((node) => {
      const label = node.label.toLowerCase();
      const nearbyRecent = [...recent].some((id) => graph.edges.some((edge) => {
        return (edge.source === id && edge.target === node.id) || (edge.target === id && edge.source === node.id);
      }));
      const score = (
        (interests.has(label) ? 45 : 0) +
        (nearbyRecent ? 25 : 0) +
        Math.min(node.citationCount ?? 0, 100) * 0.2 +
        Math.round((node.reproducibilityScore ?? 0.75) * 20)
      );
      return {
        entityId: node.id,
        label: node.label,
        type: node.type,
        score: Math.round(score),
        reason: recommendationReason(node, nearbyRecent, interests.has(label))
      };
    })
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, profile.limit ?? 5);
}

export function buildSchemaOrg(graph, documents = loadSampleCorpus()) {
  return {
    "@context": "https://schema.org",
    "@graph": graph.nodes.map((node) => {
      const document = documents.find((item) => item.id === node.id);
      return {
        "@id": `https://scibase.ai/kg/${node.id}`,
        "@type": node.schemaType,
        "name": node.label,
        ...(node.domain ? { "about": node.domain } : {}),
        ...(document?.authors ? { "author": document.authors.map((name) => ({ "@type": "Person", name })) } : {}),
        ...(document?.datasets ? { "isBasedOn": document.datasets } : {})
      };
    })
  };
}

function connectDocumentEntities(nodes, edges, document, extracted) {
  addEntityGroup(nodes, edges, document, extracted.concepts, "concept", "mentions");
  addEntityGroup(nodes, edges, document, extracted.authors, "author", "authored_by");
  addEntityGroup(nodes, edges, document, extracted.institutions, "institution", "affiliated_with");
  addEntityGroup(nodes, edges, document, extracted.tools, "tool", "uses_tool");
  addEntityGroup(nodes, edges, document, extracted.datasets, "dataset", "uses_dataset");
  addEntityGroup(nodes, edges, document, extracted.protocols, "protocol", "uses_protocol");
  addEntityGroup(nodes, edges, document, extracted.dois, "doi", "cites");
  addEntityGroup(nodes, edges, document, extracted.ontologies, "ontology", "maps_to_ontology");
}

function addEntityGroup(nodes, edges, document, values, type, predicate) {
  for (const value of values) {
    const id = idFor(type, value);
    addNode(nodes, {
      id,
      type,
      label: value,
      domains: [document.domain],
      citationCount: document.citationCount ?? 0,
      reproducibilityScore: document.reproducibilityScore ?? 0,
      source: "extracted-entity",
      schemaType: TYPE_LABELS[type] ?? "Thing"
    });
    edges.push({ source: document.id, target: id, predicate, confidence: confidenceFor(type) });
  }
}

function addCoOccurrenceEdges(edges, documents) {
  for (const document of documents) {
    const concepts = (document.concepts ?? []).map((concept) => idFor("concept", concept));
    for (let i = 0; i < concepts.length; i += 1) {
      for (let j = i + 1; j < concepts.length; j += 1) {
        edges.push({
          source: concepts[i],
          target: concepts[j],
          predicate: "co_occurs_with",
          confidence: 0.72
        });
      }
    }
  }
}

function addNode(nodes, candidate) {
  const current = nodes.get(candidate.id);
  if (!current) {
    nodes.set(candidate.id, {
      ...candidate,
      domains: uniqueValues(candidate.domains ?? (candidate.domain ? [candidate.domain] : []))
    });
    return;
  }

  nodes.set(candidate.id, {
    ...current,
    domains: uniqueValues([...(current.domains ?? []), ...(candidate.domains ?? []), ...(candidate.domain ? [candidate.domain] : [])]),
    citationCount: Math.max(current.citationCount ?? 0, candidate.citationCount ?? 0),
    reproducibilityScore: Math.max(current.reproducibilityScore ?? 0, candidate.reproducibilityScore ?? 0)
  });
}

function uniqueEdges(edges) {
  const seen = new Set();
  return edges.filter((edge) => {
    const key = `${edge.source}:${edge.predicate}:${edge.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeGraph(graph) {
  const byType = {};
  for (const node of graph.nodes) byType[node.type] = (byType[node.type] ?? 0) + 1;
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    byType
  };
}

function neighborhood(graph, seedEntityId) {
  const ids = new Set([seedEntityId]);
  for (const edge of graph.edges) {
    if (edge.source === seedEntityId) ids.add(edge.target);
    if (edge.target === seedEntityId) ids.add(edge.source);
  }
  return ids;
}

function recommendationReason(node, nearbyRecent, directInterest) {
  if (directInterest && nearbyRecent) return "Matches a stated interest and connects to recent project activity.";
  if (directInterest) return "Matches a stated research interest.";
  if (nearbyRecent) return "Connects to entities used in recent project activity.";
  return "Ranks highly by citation reach and reproducibility metadata.";
}

function idFor(type, value) {
  return `${type}-${slug(value)}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function confidenceFor(type) {
  return {
    concept: 0.88,
    author: 0.99,
    institution: 0.95,
    tool: 0.9,
    dataset: 0.93,
    protocol: 0.9,
    doi: 0.99,
    ontology: 0.86
  }[type] ?? 0.8;
}
