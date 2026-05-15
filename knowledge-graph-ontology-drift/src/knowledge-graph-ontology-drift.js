"use strict";

const crypto = require("node:crypto");

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
}

function finding(severity, id, title, detail, remediation, entityIds = []) {
  return { severity, id, title, detail, remediation, entityIds };
}

function normalizeTerm(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

function assertBundle(bundle) {
  requireFields(bundle, ["ontologyRelease", "graphNodes", "relationships", "recommendations"], "ontology drift bundle");
  requireFields(bundle.ontologyRelease, ["previousVersion", "nextVersion", "concepts", "deprecatedConcepts"], "ontology release");
}

function conceptById(concepts) {
  return new Map(concepts.map((concept) => [concept.id, concept]));
}

function deprecatedById(deprecatedConcepts) {
  return new Map(deprecatedConcepts.map((concept) => [concept.oldId, concept]));
}

function collectConceptUsage(graphNodes, relationships) {
  const usage = new Map();

  for (const node of graphNodes) {
    for (const conceptId of node.conceptIds) {
      if (!usage.has(conceptId)) usage.set(conceptId, { nodes: [], relationships: [] });
      usage.get(conceptId).nodes.push(node.id);
    }
  }

  for (const relationship of relationships) {
    for (const conceptId of relationship.conceptIds) {
      if (!usage.has(conceptId)) usage.set(conceptId, { nodes: [], relationships: [] });
      usage.get(conceptId).relationships.push(relationship.id);
    }
  }

  return usage;
}

function evaluateDeprecations(ontologyRelease, graphNodes, relationships) {
  const findings = [];
  const usage = collectConceptUsage(graphNodes, relationships);
  const nextConcepts = conceptById(ontologyRelease.concepts);

  for (const deprecated of ontologyRelease.deprecatedConcepts) {
    const affected = usage.get(deprecated.oldId);
    if (!affected) continue;

    if (!deprecated.replacementId || !nextConcepts.has(deprecated.replacementId)) {
      findings.push(finding(
        "blocker",
        "deprecated-concept-without-valid-replacement",
        "Deprecated concept is still in use without a valid replacement",
        `${deprecated.oldId} affects ${affected.nodes.length} node(s) and ${affected.relationships.length} relationship(s).`,
        "Add a replacement concept to the ontology release before migrating graph references.",
        [...affected.nodes, ...affected.relationships],
      ));
      continue;
    }

    findings.push(finding(
      "blocker",
      "deprecated-concept-in-use",
      "Deprecated concept still appears in graph data",
      `${deprecated.oldId} should migrate to ${deprecated.replacementId}.`,
      "Apply a reviewed concept migration to affected nodes, relationships, and recommendations.",
      [...affected.nodes, ...affected.relationships],
    ));
  }

  return findings;
}

function evaluateSynonymCollisions(concepts) {
  const findings = [];
  const bySynonym = new Map();

  for (const concept of concepts) {
    const terms = [concept.label, ...(concept.synonyms || [])].map(normalizeTerm).filter(Boolean);
    for (const term of new Set(terms)) {
      if (!bySynonym.has(term)) bySynonym.set(term, []);
      bySynonym.get(term).push(concept.id);
    }
  }

  for (const [term, conceptIds] of bySynonym) {
    const uniqueIds = [...new Set(conceptIds)];
    if (uniqueIds.length > 1) {
      findings.push(finding(
        "warning",
        "synonym-collision",
        "Ontology synonym maps to multiple concepts",
        `"${term}" maps to ${uniqueIds.join(", ")}.`,
        "Add disambiguation rules or remove ambiguous synonyms before enabling search/recommendation expansion.",
        uniqueIds,
      ));
    }
  }

  return findings;
}

function evaluateRecommendationPaths(recommendations, deprecatedConcepts) {
  const findings = [];
  const deprecatedIds = new Set(deprecatedConcepts.map((concept) => concept.oldId));

  for (const recommendation of recommendations) {
    const staleConcepts = recommendation.conceptPath.filter((conceptId) => deprecatedIds.has(conceptId));
    if (staleConcepts.length > 0 && recommendation.status === "active") {
      findings.push(finding(
        "blocker",
        "stale-recommendation-path",
        "Active recommendation depends on deprecated ontology concepts",
        `${recommendation.id} includes deprecated concept(s): ${staleConcepts.join(", ")}.`,
        "Invalidate or regenerate the recommendation after ontology migration.",
        [recommendation.id],
      ));
    }
  }

  return findings;
}

function evaluateRelationshipEvidence(relationships, options) {
  const findings = [];
  const now = parseDate(options.now);
  const maxEvidenceAgeDays = options.maxEvidenceAgeDays || 540;

  for (const relationship of relationships) {
    const evidenceDate = parseDate(relationship.evidenceDate);
    const ageDays = Math.floor((now.getTime() - evidenceDate.getTime()) / 86400000);
    if (ageDays > maxEvidenceAgeDays) {
      findings.push(finding(
        "warning",
        "relationship-evidence-stale",
        "Relationship evidence is older than the freshness window",
        `${relationship.id} evidence is ${ageDays} days old.`,
        "Revalidate stale evidence before using it for graph recommendations.",
        [relationship.id],
      ));
    }
  }

  return findings;
}

function buildMigrationActions(ontologyRelease, graphNodes, relationships, recommendations) {
  const deprecated = deprecatedById(ontologyRelease.deprecatedConcepts);
  const actions = [];

  for (const node of graphNodes) {
    const replacements = node.conceptIds
      .filter((conceptId) => deprecated.has(conceptId))
      .map((conceptId) => ({ from: conceptId, to: deprecated.get(conceptId).replacementId }));
    if (replacements.length > 0) {
      actions.push({
        type: "node-concept-migration",
        targetId: node.id,
        replacements,
      });
    }
  }

  for (const relationship of relationships) {
    const replacements = relationship.conceptIds
      .filter((conceptId) => deprecated.has(conceptId))
      .map((conceptId) => ({ from: conceptId, to: deprecated.get(conceptId).replacementId }));
    if (replacements.length > 0) {
      actions.push({
        type: "relationship-concept-migration",
        targetId: relationship.id,
        replacements,
      });
    }
  }

  for (const recommendation of recommendations) {
    if (recommendation.conceptPath.some((conceptId) => deprecated.has(conceptId))) {
      actions.push({
        type: "recommendation-regeneration",
        targetId: recommendation.id,
        reason: "recommendation path references deprecated concepts",
      });
    }
  }

  return actions;
}

function calculateImpactScore(actions, graphNodes, relationships, recommendations) {
  const denominator = graphNodes.length + relationships.length + recommendations.length;
  if (denominator === 0) return 0;
  return Number((actions.length / denominator).toFixed(3));
}

function decide(findings) {
  if (findings.some((item) => item.severity === "blocker")) return "migration-required";
  if (findings.some((item) => item.severity === "warning")) return "manual-review";
  return "graph-current";
}

function analyzeOntologyDrift(bundle, options = {}) {
  assertBundle(bundle);
  const now = options.now || bundle.now || new Date().toISOString();
  const findings = [
    ...evaluateDeprecations(bundle.ontologyRelease, bundle.graphNodes, bundle.relationships),
    ...evaluateSynonymCollisions(bundle.ontologyRelease.concepts),
    ...evaluateRecommendationPaths(bundle.recommendations, bundle.ontologyRelease.deprecatedConcepts),
    ...evaluateRelationshipEvidence(bundle.relationships, {
      now,
      maxEvidenceAgeDays: options.maxEvidenceAgeDays || bundle.maxEvidenceAgeDays,
    }),
  ];
  const migrationActions = buildMigrationActions(
    bundle.ontologyRelease,
    bundle.graphNodes,
    bundle.relationships,
    bundle.recommendations,
  );
  const decision = decide(findings);
  const impactScore = calculateImpactScore(
    migrationActions,
    bundle.graphNodes,
    bundle.relationships,
    bundle.recommendations,
  );
  const auditDigest = stableHash({
    previousVersion: bundle.ontologyRelease.previousVersion,
    nextVersion: bundle.ontologyRelease.nextVersion,
    decision,
    findings,
    migrationActions,
    impactScore,
  });

  return {
    previousVersion: bundle.ontologyRelease.previousVersion,
    nextVersion: bundle.ontologyRelease.nextVersion,
    evaluatedAt: parseDate(now).toISOString(),
    decision,
    impactScore,
    findings,
    migrationActions,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  analyzeOntologyDrift,
  stableHash,
  stableStringify,
};
