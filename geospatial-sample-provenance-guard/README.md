# Geospatial Sample Provenance Guard

Self-contained Scientific Knowledge Graph Integration slice for
`SCIBASE-AI/SCIBASE.AI#17`.

The guard evaluates field-sample and specimen location graph edges before they
appear on entity pages or public discovery recommendations. It checks coordinate
ranges, CRS normalization, country/coordinate consistency, coordinate precision,
sensitive-site redaction, voucher identifiers, dataset DOI resolution,
collection-date plausibility, and sample-to-dataset edge alignment. It also
fails closed on duplicate graph identities or DOI provenance, malformed
collection dates, duplicate relations, and public recommendations whose country
bounds cannot be validated.

This is intentionally separate from broad graph extraction/navigation, link
audit, ontology drift/alias/synonym controls, relationship conflict arbitration,
author-affiliation disambiguation, artifact lineage, evidence freshness,
instrument-method compatibility, reproducibility routes, recommendation
visibility/diversity, negative-result replication, measurement harmonization,
claim qualifier, ethics provenance, funder award lineage, clinical trial
registry, and software/runtime compatibility slices.

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Outputs

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`

All data is synthetic. The module does not call geocoders, repositories, GIS
systems, ontology services, specimen registries, journal systems, or external
APIs.
