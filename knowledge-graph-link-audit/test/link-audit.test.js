import assert from "node:assert/strict";
import test from "node:test";
import { graphSnapshot } from "../src/sample-data.js";
import {
  auditReferences,
  auditRelationships,
  buildGraphAuditPacket,
  buildJsonLdExport,
  buildNormalizedEntities,
  buildRecommendationProvenance,
  buildRemediationQueue,
  clone,
  explainGraphQuery,
  normalizeEntityLabel,
  scoreRelationshipEvidence,
  suggestEntityMerges,
} from "../src/link-audit.js";
import { createServer } from "../src/server.js";

test("normalizes ontology aliases into canonical graph keys", () => {
  assert.equal(normalizeEntityLabel("CRISPR/Cas9", graphSnapshot.ontologyAliases), "crispr-cas9");
  assert.equal(normalizeEntityLabel("single cell transcriptomics", graphSnapshot.ontologyAliases), "single-cell-rna-seq");
});

test("builds JSON-LD-ready normalized entities", () => {
  const entities = buildNormalizedEntities(graphSnapshot);
  const dataset = entities.find((entity) => entity.id === "dataset-response-atlas");

  assert.equal(entities.length, graphSnapshot.entities.length);
  assert.equal(dataset.schemaType, "Dataset");
  assert.equal(dataset.jsonLdId, "https://doi.org/10.5555/scibase.organoid.2026.v1");
});

test("suggests duplicate entity merges using shared ontology ids", () => {
  const merges = suggestEntityMerges(graphSnapshot);

  assert.ok(merges.some((merge) => merge.canonicalId === "concept-crispr-cas9" && merge.duplicateIds.includes("concept-crispr-cas9-dup")));
  assert.ok(!merges.some((merge) => merge.duplicateIds.includes("dataset-response-atlas-stale")));
  assert.match(merges[0].evidenceHash, /^sha256:/);
});

test("scores relationship evidence from confidence, source diversity, and volume", () => {
  const relationship = graphSnapshot.relationships.find((item) => item.id === "rel-paper-uses-dataset");
  const weakRelationship = graphSnapshot.relationships.find((item) => item.id === "rel-paper-mentions-crispr-dup");

  assert.ok(scoreRelationshipEvidence(relationship) > scoreRelationshipEvidence(weakRelationship));
});

test("audits stale and weak relationships", () => {
  const audits = auditRelationships(graphSnapshot);

  assert.ok(audits.some((audit) => audit.relationshipId === "rel-stale-dataset-link" && audit.status === "stale"));
  assert.ok(audits.some((audit) => audit.relationshipId === "rel-paper-mentions-crispr-dup" && audit.requiredActions.includes("refresh-relationship-verification")));
});

test("audits superseded DOI references", () => {
  const references = auditReferences(graphSnapshot);

  assert.ok(references.some((reference) => reference.status === "superseded" && reference.requiredAction === "replace-with-current-doi"));
});

test("explains graph queries with normalized terms and trusted relationship filters", () => {
  const explanation = explainGraphQuery(graphSnapshot, "query-crispr-scrna");

  assert.equal(explanation.queryId, "query-crispr-scrna");
  assert.ok(explanation.matchedEntities.length >= 2);
  assert.ok(explanation.explanationSteps.some((step) => step.includes("Normalized")));
  assert.match(explanation.explanationHash, /^sha256:/);
});

test("builds recommendation provenance with why signals", () => {
  const recommendations = buildRecommendationProvenance(graphSnapshot);

  assert.equal(recommendations.userId, "user-chen");
  assert.ok(recommendations.recommendations.length > 0);
  assert.ok(recommendations.recommendations.every((item) => item.why.length > 0));
});

test("builds remediation queue from merge, relationship, and reference audits", () => {
  const queue = buildRemediationQueue(graphSnapshot);

  assert.ok(queue.totalItems >= 3);
  assert.ok(queue.highPriorityItems >= 2);
  assert.ok(queue.queueItems.some((item) => item.type === "entity-merge"));
  assert.ok(queue.queueItems.some((item) => item.type === "reference-refresh"));
  assert.match(queue.queueHash, /^sha256:/);
});

test("exports schema.org JSON-LD graph", () => {
  const jsonLd = buildJsonLdExport(graphSnapshot);

  assert.equal(jsonLd["@context"], "https://schema.org");
  assert.equal(jsonLd["@graph"].length, graphSnapshot.entities.length);
  assert.match(jsonLd.exportHash, /^sha256:/);
});

test("builds full graph audit packet", () => {
  const packet = buildGraphAuditPacket(graphSnapshot);

  assert.equal(packet.packetVersion, "knowledge-graph-link-audit/v0.1");
  assert.ok(packet.mergeSuggestions.length > 0);
  assert.ok(packet.remediationQueue.totalItems > 0);
  assert.match(packet.auditHash, /^sha256:/);
});

test("API factory uses injected graph snapshot", async () => {
  const snapshot = clone(graphSnapshot);
  snapshot.id = "custom-kg-cycle";

  const server = createServer(snapshot);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/audit-packet`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.snapshotId, "custom-kg-cycle");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
