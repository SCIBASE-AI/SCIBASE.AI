# Knowledge Graph Ingestion Audit

Project: proj-crispr-neuro-graph
Decision: block-graph-publication
Risk score: 100
Relationships: 2
Recommendations: 1
Audit digest: 0589aebec7ba5969

## Entity Counts
- author: 1
- concept: 1
- dataset: 1
- method: 1
- paper: 1

## Findings
- [high] Required knowledge graph entity type is missing: proj-crispr-neuro-graph has no extracted software entities.
  Action: Add at least one reviewed software entity before publishing this graph slice.
- [high] Entity identifier does not match the expected namespace: paper:paper-1 identifier=missing-doi.
  Action: Normalize the entity to DOI, ORCID, DataCite, MeSH, PubChem, UniProt, Wikidata, SWH, or GitHub form.
- [high] Entity identifier does not match the expected namespace: author:author-1 identifier=orcid-pending.
  Action: Normalize the entity to DOI, ORCID, DataCite, MeSH, PubChem, UniProt, Wikidata, SWH, or GitHub form.
- [high] Extracted entity confidence is below threshold: dataset:dataset-1 confidence=0.7, threshold=0.78.
  Action: Route the entity to human review or hide it from recommendations until verified.
- [blocker] Private entity lacks a project scope: dataset:dataset-1 is private without a privateProjectId.
  Action: Attach private graph nodes to a project scope or exclude them from shared graph exports.
- [high] Relationship lacks extraction provenance: edge-1 has incomplete source document or extractor metadata.
  Action: Store source document, span, extractor version, and review state for every edge.
- [medium] Relationship has weak evidence support: edge-1 has 1 evidence items, below 2.
  Action: Require more evidence or mark the edge as tentative in graph navigation.
- [blocker] Public relationship is derived from private content: edge-1 is public but cites private source content.
  Action: Downgrade the edge to private scope or re-extract it from public evidence.
- [blocker] Relationship references a missing entity: edge-2 links paper:paper-1 -> software:software-missing, but at least one endpoint is absent.
  Action: Create the missing entity or remove the relationship before graph export.
- [high] AI recommendation lacks enough graph evidence: rec-1 has 1 evidence edges.
  Action: Hide or label the recommendation until enough verified graph evidence supports it.
- [blocker] Public recommendation uses private user or project signals: rec-1 combines private signals with public visibility.
  Action: Keep private-signal recommendations in the user workspace only.
- [medium] Graph export format is missing or unsupported: proj-crispr-neuro-graph export format=csv.
  Action: Choose jsonld, rdf, or graphml for downstream graph consumers.
- [high] Public graph export lacks a license: proj-crispr-neuro-graph is configured for public graph export without a license.
  Action: Set a graph metadata license before publishing reusable linked data.
- [medium] Graph export lacks a schema version: proj-crispr-neuro-graph has no schema version in exportConfig.
  Action: Pin a schema version so downstream consumers can validate graph payloads.

## Safety
- Synthetic graph packet only; no private research content, user activity, live ontology services, credentials, or external APIs.
