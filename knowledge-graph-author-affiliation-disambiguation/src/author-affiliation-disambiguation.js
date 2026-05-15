const crypto = require("crypto");

const STOPWORDS = new Set(["dr", "prof", "phd", "md"]);
const AFFILIATION_ALIASES = new Map([
  ["univ", "university"],
  ["dept", "department"],
  ["mit", "massachusetts institute of technology"],
  ["ucsf", "university of california san francisco"]
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeName(name) {
  const tokens = normalizeText(name)
    .replace(/\./g, " ")
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token));
  return {
    normalized: tokens.join(" "),
    tokens,
    initials: tokens.map((token) => token[0]).join(""),
    surname: tokens.at(-1) || ""
  };
}

function normalizeAffiliation(affiliation) {
  const tokens = normalizeText(affiliation)
    .split(" ")
    .map((token) => token.replace(/\./g, ""))
    .flatMap((token) => (AFFILIATION_ALIASES.has(token) ? AFFILIATION_ALIASES.get(token).split(" ") : [token]))
    .filter(Boolean);
  return [...new Set(tokens)].sort();
}

function emailDomain(email) {
  const parts = String(email || "").toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 && b.size === 0) {
    return 0;
  }
  const intersection = [...a].filter((item) => b.has(item)).length;
  return intersection / new Set([...a, ...b]).size;
}

function conceptOverlap(left, right) {
  return jaccard((left.concepts || []).map(normalizeText), (right.concepts || []).map(normalizeText));
}

function nameSimilarity(left, right) {
  const a = normalizeName(left.name);
  const b = normalizeName(right.name);
  if (a.normalized === b.normalized) {
    return 1;
  }
  if (a.surname && a.surname === b.surname && (a.initials[0] === b.initials[0] || a.tokens[0] === b.tokens[0])) {
    return 0.82;
  }
  return jaccard(a.tokens, b.tokens);
}

function compareMentions(left, right) {
  if (left.orcid && right.orcid && left.orcid === right.orcid) {
    return {
      score: 0.99,
      decision: "same-author",
      reasons: ["orcid-exact-match"]
    };
  }

  const nameScore = nameSimilarity(left, right);
  const affiliationScore = jaccard(normalizeAffiliation(left.affiliation), normalizeAffiliation(right.affiliation));
  const domainScore = emailDomain(left.email) && emailDomain(left.email) === emailDomain(right.email) ? 1 : 0;
  const topicScore = conceptOverlap(left, right);
  const score = Number((nameScore * 0.45 + affiliationScore * 0.25 + domainScore * 0.2 + topicScore * 0.1).toFixed(3));

  const reasons = [
    `name:${nameScore.toFixed(2)}`,
    `affiliation:${affiliationScore.toFixed(2)}`,
    `email-domain:${domainScore.toFixed(2)}`,
    `concepts:${topicScore.toFixed(2)}`
  ];

  if (score >= 0.7 || (nameScore >= 0.82 && affiliationScore >= 0.35 && topicScore >= 0.25)) {
    return {score, decision: "same-author", reasons};
  }
  if (nameScore >= 0.82 && affiliationScore < 0.18 && domainScore === 0) {
    return {score, decision: "homonym-review", reasons};
  }
  if (score >= 0.5) {
    return {score, decision: "needs-review", reasons};
  }
  return {score, decision: "different-author", reasons};
}

function clusterMentions(mentions) {
  const clusters = [];
  const reviewQueue = [];

  for (const mention of mentions) {
    let best = null;
    for (const cluster of clusters) {
      const comparisons = cluster.mentions.map((existing) => compareMentions(existing, mention));
      const strongest = comparisons.reduce((max, item) => (item.score > max.score ? item : max), {score: 0});
      if (!best || strongest.score > best.comparison.score) {
        best = {cluster, comparison: strongest};
      }
    }

    if (best && best.comparison.decision === "same-author") {
      best.cluster.mentions.push(mention);
      best.cluster.evidence.push({mentionId: mention.mentionId, score: best.comparison.score, reasons: best.comparison.reasons});
    } else {
      const clusterId = `author-${clusters.length + 1}`;
      clusters.push({
        clusterId,
        canonicalName: mention.name,
        canonicalAffiliation: mention.affiliation,
        mentions: [mention],
        evidence: [{mentionId: mention.mentionId, score: 1, reasons: ["cluster-seed"]}]
      });
    }

    if (best && best.comparison.decision !== "same-author" && best.comparison.score >= 0.45) {
      reviewQueue.push({
        leftClusterId: best.cluster.clusterId,
        mentionId: mention.mentionId,
        decision: best.comparison.decision,
        score: best.comparison.score,
        reasons: best.comparison.reasons
      });
    }
  }

  return {clusters, reviewQueue};
}

function buildCollaborationEdges(clusters) {
  const byDocument = new Map();
  for (const cluster of clusters) {
    for (const mention of cluster.mentions) {
      if (!byDocument.has(mention.documentId)) {
        byDocument.set(mention.documentId, []);
      }
      byDocument.get(mention.documentId).push({cluster, mention});
    }
  }

  const edges = new Map();
  for (const [documentId, authors] of byDocument.entries()) {
    for (let i = 0; i < authors.length; i += 1) {
      for (let j = i + 1; j < authors.length; j += 1) {
        const pair = [authors[i].cluster.clusterId, authors[j].cluster.clusterId].sort();
        const edgeId = pair.join("--");
        const edge = edges.get(edgeId) || {
          edgeId,
          source: pair[0],
          target: pair[1],
          documents: [],
          sharedConcepts: new Set(),
          confidence: 0
        };
        edge.documents.push(documentId);
        for (const concept of [...(authors[i].mention.concepts || []), ...(authors[j].mention.concepts || [])]) {
          edge.sharedConcepts.add(normalizeText(concept));
        }
        edge.confidence = Math.min(1, edge.confidence + 0.25);
        edges.set(edgeId, edge);
      }
    }
  }

  return [...edges.values()].map((edge) => ({
    ...edge,
    sharedConcepts: [...edge.sharedConcepts].sort(),
    confidence: Number(edge.confidence.toFixed(2))
  }));
}

function createAuthorGraph(mentions) {
  const {clusters, reviewQueue} = clusterMentions(mentions);
  const collaborationEdges = buildCollaborationEdges(clusters);
  const graphHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({clusters, reviewQueue, collaborationEdges}))
    .digest("hex");

  return {
    generatedAt: new Date("2026-05-15T00:00:00.000Z").toISOString(),
    graphHash,
    authorNodes: clusters.map((cluster) => ({
      id: cluster.clusterId,
      name: cluster.canonicalName,
      affiliation: cluster.canonicalAffiliation,
      mentionIds: cluster.mentions.map((mention) => mention.mentionId),
      documents: [...new Set(cluster.mentions.map((mention) => mention.documentId))].sort(),
      concepts: [...new Set(cluster.mentions.flatMap((mention) => mention.concepts || []).map(normalizeText))].sort(),
      evidence: cluster.evidence
    })),
    collaborationEdges,
    curatorQueue: reviewQueue,
    recommendationGuards: reviewQueue.map((item) => ({
      reason: "author-identity-uncertain",
      action: "suppress cross-lab collaboration recommendations until reviewed",
      mentionId: item.mentionId,
      candidateClusterId: item.leftClusterId,
      score: item.score
    }))
  };
}

function toSchemaOrg(graph) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "SCIBASE author-affiliation disambiguation graph",
    identifier: graph.graphHash,
    creator: graph.authorNodes.map((node) => ({
      "@type": "Person",
      name: node.name,
      affiliation: {
        "@type": "Organization",
        name: node.affiliation
      },
      sameAs: node.mentionIds
    }))
  };
}

module.exports = {
  compareMentions,
  createAuthorGraph,
  normalizeAffiliation,
  normalizeName,
  toSchemaOrg
};
