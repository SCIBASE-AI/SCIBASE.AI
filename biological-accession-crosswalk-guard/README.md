# Biological Accession Crosswalk Guard

Self-contained Scientific Knowledge Graph Integration slice for SCIBASE issue #17.

The guard validates canonical biological accession nodes before entity pages or graph recommendations are shown. It checks namespace-specific formats for NCBI Gene, UniProtKB, PubChem, and MeSH identifiers; deprecated aliases; taxon mismatch; DOI-backed evidence; low crosswalk confidence; duplicate canonical targets; and unsafe recommendation paths that depend on unresolved nodes.

## Files

- `index.js` - dependency-free evaluator and Markdown reviewer packet builder
- `sample-data.js` - synthetic biological knowledge graph nodes
- `test.js` - Node test coverage for hold, review, recommendation suppression, and approved paths
- `demo.js` - writes JSON, Markdown, and SVG reviewer artifacts under `reports/`
- `render-video.js` - creates a short MP4 demo artifact

## Validation

```bash
npm run check
npm test
npm run demo
npm run video
```

Synthetic data only. No private research objects, external ontology services, registry calls, recommendation services, credentials, network calls, payment data, or payout details are used.
