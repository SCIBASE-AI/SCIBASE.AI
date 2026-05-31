# Organism Strain Boundary Guard

This module adds a focused organism, strain, cell-line, and host-species
boundary guard for Scientific Knowledge Graph Integration. It protects entity
pages, graph navigation, and AI recommendation paths from unsafe biological
node relationships before they are published.

## Scope

The guard validates synthetic knowledge graph packets for:

- sample-to-organism taxon consistency
- strain-to-parent-species boundaries
- pathogen-to-host role direction and supported host taxon evidence
- cell-line species provenance and culture collection evidence
- mixed-organism sample edges that need contamination or co-culture review
- recommendation paths that depend on suppressed or review-only biological
  graph edges

It emits deterministic edge decisions, recommendation decisions, curator
actions, JSON-LD review packets, Markdown reports, SVG summaries, and a short
H.264 demo video. No credentials, live APIs, private data, or external services
are used.

## Issue #17 Requirement Mapping

- Entity extraction and linked data: consumes typed organism, strain,
  cell-line, pathogen, sample, and dataset graph nodes and exports a JSON-LD
  review packet.
- Knowledge navigation: prevents graph search paths from crossing unsupported
  organism or strain boundaries.
- AI research recommendations: suppresses recommendations that rely on
  taxon-mismatched, role-inverted, or unresolved mixed-organism graph paths.
- Entity pages and curator workflows: emits per-edge evidence reasons and
  remediation actions for graph stewards.

## Non-Overlap

This is not a biological accession crosswalk, geospatial sample provenance
guard, measurement harmonization module, temporal-validity guard, evidence
freshness guard, multilingual alias guard, ontology drift migration, or broad
graph ingestion module. It focuses specifically on biological boundary safety
for organism, strain, host, cell-line, and sample graph edges.

## Validation

```bash
node organism-strain-boundary-guard/test.js
node organism-strain-boundary-guard/demo.js
node organism-strain-boundary-guard/render-video.js
node --check organism-strain-boundary-guard/index.js
node --check organism-strain-boundary-guard/sample-data.js
node --check organism-strain-boundary-guard/test.js
node --check organism-strain-boundary-guard/demo.js
node --check organism-strain-boundary-guard/render-video.js
git diff --check
```
