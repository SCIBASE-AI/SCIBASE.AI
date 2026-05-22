# Requirements Map

Issue: SCIBASE.AI #17 Scientific Knowledge Graph Integration

## Entity Extraction

- Funder entities: represented by canonical funder nodes with IDs and URIs.
- Award entities: normalized award numbers, award URIs, dates, mandates, and funder edges.
- Output entities: publications, datasets, and other outputs inherit or declare funding edges.

## Knowledge Navigation

- Graph integrity: project-to-award and output-to-award edges are checked for missing targets.
- Entity pages: award nodes include funder, URI, status, dates, and mandate metadata.
- Filters and discovery: output mandate metadata can support open-access, data-sharing, and funder-reporting filters.

## AI Research Recommendations

- Funder-aware recommendations are blocked when they rely on missing or inactive award lineage.
- Recommendations using funder affinity are flagged when no explanation is attached.

## Safety Boundaries

- Uses synthetic graph data only.
- Makes no external grant, DOI, ROR, Crossref, or funder API calls.
- Stores no credentials, private manuscripts, patient records, or payout data.
