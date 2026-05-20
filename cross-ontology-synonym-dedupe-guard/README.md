# Cross-Ontology Synonym Dedupe Guard

This focused slice adds deduplicates graph entities that collide across ontology synonym sets for issue #17.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node cross-ontology-synonym-dedupe-guard/test.js
node cross-ontology-synonym-dedupe-guard/demo.js
```

Generated outputs are written to `cross-ontology-synonym-dedupe-guard/reports/`.

## Why this is distinct

This does not duplicate extractor, navigator, link audit, ontology drift/deprecation, relationship conflict, recommendation visibility, measurement harmonization, negative-result graph, or reproducibility-route slices. It focuses specifically on deduplicates graph entities that collide across ontology synonym sets.
