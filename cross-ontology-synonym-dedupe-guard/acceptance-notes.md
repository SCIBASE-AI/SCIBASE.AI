# Acceptance Notes

## Scope

Adds deduplicates graph entities that collide across ontology synonym sets for issue #17.

## Non-overlap

This slice avoids extractor, navigator, link audit, ontology drift/deprecation, relationship conflict, recommendation visibility, measurement harmonization, negative-result graph, or reproducibility-route slices.

## Validation

```bash
node cross-ontology-synonym-dedupe-guard/test.js
node cross-ontology-synonym-dedupe-guard/demo.js
file cross-ontology-synonym-dedupe-guard/reports/demo.webm cross-ontology-synonym-dedupe-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `cross-ontology-synonym-dedupe-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
