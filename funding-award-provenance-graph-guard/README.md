# Funding Award Provenance Graph Guard

Self-contained reviewer artifact for SCIBASE Scientific Knowledge Graph Integration (#17).

This slice checks whether funding and grant relationships are safe to publish into knowledge graph entity pages and recommendation paths. It focuses on funder aliases, award identifiers, grant date windows, required acknowledgements, DOI/project linkage, conflict-of-interest flags, and private funding path redaction.

## Scope

- Synthetic data only.
- No credentials, external APIs, live funder systems, private user data, or payment systems.
- Distinct from broad graph extractors, multilingual aliases, geospatial sample provenance, organism/strain boundaries, ontology drift, temporal consistency, and generic recommendation modules.

## Validation

```bash
node funding-award-provenance-graph-guard/test.js
node funding-award-provenance-graph-guard/demo.js
```

The demo writes deterministic reviewer artifacts under `funding-award-provenance-graph-guard/reports/`.

## Reviewer Artifacts

- `reports/funding-award-provenance-packet.json`
- `reports/funding-award-provenance-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`
