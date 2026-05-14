const ENTITY_PATTERNS = Object.freeze({
  dataset: /\b(dataset|cohort|benchmark|holdout)\b/gi,
  method: /\b(CRISPR|transformer|regression|clustering|protocol|notebook)\b/gi,
  tool: /\b(Python|Jupyter|PyTorch|R|Julia|Docker)\b/gi,
  concept: /\b(neuroscience|heat|health|single-cell|reproducibility|canopy)\b/gi,
  reference: /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/gi
});

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractEntities(document) {
  const text = `${document.title} ${document.abstract} ${document.body}`;
  const entities = [];
  for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
    for (const match of text.matchAll(pattern)) {
      const label = match[0];
      entities.push({
        id: `${type}:${slugify(label)}`,
        type,
        label,
        sourceDocumentId: document.id,
        context: text.slice(Math.max(0, match.index - 40), match.index + label.length + 40)
      });
    }
  }
  for (const author of document.authors) {
    entities.push({
      id: `author:${slugify(author.name)}`,
      type: "author",
      label: author.name,
      affiliation: author.affiliation,
      sourceDocumentId: document.id
    });
  }
  return uniqueBy(entities, (entity) => entity.id);
}

export function buildRelationships(document, entities) {
  const relationships = [];
  const authorEntities = entities.filter((entity) => entity.type === "author");
  const nonAuthorEntities = entities.filter((entity) => entity.type !== "author");
  for (const author of authorEntities) {
    relationships.push({
      from: author.id,
      to: `document:${document.id}`,
      type: "authored",
      evidence: document.title
    });
  }
  for (const entity of nonAuthorEntities) {
    relationships.push({
      from: `document:${document.id}`,
      to: entity.id,
      type: entity.type === "reference" ? "cites" : "mentions",
      evidence: entity.context
    });
  }
  for (const dataset of nonAuthorEntities.filter((entity) => entity.type === "dataset")) {
    for (const method of nonAuthorEntities.filter((entity) => entity.type === "method")) {
      relationships.push({
        from: method.id,
        to: dataset.id,
        type: "applied_to",
        evidence: `${method.label} appears with ${dataset.label} in ${document.id}`
      });
    }
  }
  return relationships;
}

export function buildGraph(documents) {
  const documentNodes = documents.map((document) => ({
    id: `document:${document.id}`,
    type: "document",
    label: document.title,
    domain: document.domain,
    year: document.year,
    citationCount: document.citationCount,
    reproducibilityScore: document.reproducibilityScore
  }));
  const entityNodes = documents.flatMap(extractEntities);
  const nodes = uniqueBy([...documentNodes, ...entityNodes], (node) => node.id);
  const relationships = documents.flatMap((document) =>
    buildRelationships(document, extractEntities(document))
  );
  return { nodes, relationships };
}

export function searchGraph(graph, { query, type, minReproducibility = 0 }) {
  const q = query.toLowerCase();
  const matchingNodes = graph.nodes.filter((node) => {
    const labelMatch = node.label.toLowerCase().includes(q);
    const typeMatch = type ? node.type === type : true;
    const reproducibilityMatch =
      node.type !== "document" || node.reproducibilityScore >= minReproducibility;
    return labelMatch && typeMatch && reproducibilityMatch;
  });
  const ids = new Set(matchingNodes.map((node) => node.id));
  const relationships = graph.relationships.filter(
    (relationship) => ids.has(relationship.from) || ids.has(relationship.to)
  );
  return { nodes: matchingNodes, relationships };
}

export function buildEntityPage(graph, entityId) {
  const entity = graph.nodes.find((node) => node.id === entityId);
  if (!entity) throw new Error(`Unknown entity: ${entityId}`);
  const inbound = graph.relationships.filter((relationship) => relationship.to === entityId);
  const outbound = graph.relationships.filter((relationship) => relationship.from === entityId);
  return {
    entity,
    inboundCount: inbound.length,
    outboundCount: outbound.length,
    usageContexts: [...inbound, ...outbound].map((relationship) => relationship.evidence)
  };
}

export function exportJsonLd(graph) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "SCIBASE Scientific Knowledge Graph",
    graph: graph.nodes.map((node) => ({
      "@id": node.id,
      "@type": node.type === "author" ? "Person" : node.type === "document" ? "ScholarlyArticle" : "Thing",
      name: node.label
    }))
  };
}

export function recommendResearch(graph, { userInterests, recentDocumentIds }) {
  const interestTokens = userInterests.map((interest) => interest.toLowerCase());
  return graph.nodes
    .filter((node) => node.type === "document" && !recentDocumentIds.includes(node.id.replace("document:", "")))
    .map((node) => {
      const label = node.label.toLowerCase();
      const interestScore = interestTokens.filter((interest) => label.includes(interest)).length * 20;
      const reproducibilityScore = node.reproducibilityScore / 5;
      const citationScore = Math.min(20, node.citationCount / 10);
      return {
        documentId: node.id,
        title: node.label,
        score: Math.round(interestScore + reproducibilityScore + citationScore),
        reasons: [
          interestScore ? "matches_user_interest" : null,
          node.reproducibilityScore >= 80 ? "high_reproducibility" : null,
          node.citationCount >= 100 ? "high_citation_count" : null
        ].filter(Boolean)
      };
    })
    .sort((a, b) => b.score - a.score || a.documentId.localeCompare(b.documentId))
    .slice(0, 3);
}
