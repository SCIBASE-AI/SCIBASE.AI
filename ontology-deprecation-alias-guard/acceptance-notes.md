# Acceptance Notes

## Scope

Adds guards knowledge graph entities that use deprecated ontology terms or missing aliases for issue #17.

## Non-overlap

This slice avoids extractor, navigator, ontology drift, recommendation visibility, negative-result graph, measurement harmonization, evidence freshness, retraction, reproducibility-route, or author-affiliation slices.

## Validation

```bash
node ontology-deprecation-alias-guard/test.js
node ontology-deprecation-alias-guard/demo.js
file ontology-deprecation-alias-guard/reports/demo.webm ontology-deprecation-alias-guard/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `ontology-deprecation-alias-guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
