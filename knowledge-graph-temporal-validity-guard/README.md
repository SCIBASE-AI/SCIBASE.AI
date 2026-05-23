# Knowledge Graph Temporal Validity Guard

Focused Scientific Knowledge Graph Integration slice for issue #17.

The guard validates graph snapshots before entity pages and AI recommendations are shown. It checks whether nodes, edges, dataset versions, method applicability records, institution affiliations, and recommendation paths are effective on the graph snapshot date and have not expired or drifted to stale versions.

## Run

```bash
npm test
npm run check
npm run demo
npm run video
```

## Reviewer Artifacts

- `reports/temporal-validity-packet.json`
- `reports/temporal-validity-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Scope

This is not an evidence freshness, ontology drift, author disambiguation, recommendation diversity, or accession crosswalk module. It focuses only on effective-date, expiry-date, and version-window validity for graph objects at one snapshot date.
