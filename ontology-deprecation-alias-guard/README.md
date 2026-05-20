# Ontology Deprecation Alias Guard

This focused slice adds guards knowledge graph entities that use deprecated ontology terms or missing aliases for issue #17.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node ontology-deprecation-alias-guard/test.js
node ontology-deprecation-alias-guard/demo.js
```

Generated outputs are written to `ontology-deprecation-alias-guard/reports/`.

## Why this is distinct

This does not duplicate extractor, navigator, ontology drift, recommendation visibility, negative-result graph, measurement harmonization, evidence freshness, retraction, reproducibility-route, or author-affiliation slices. It focuses specifically on guards knowledge graph entities that use deprecated ontology terms or missing aliases.
