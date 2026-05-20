# Repository Metadata Release Readiness Gate

This focused slice adds checks repository metadata completeness before public scientific release for issue #10.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node repository-metadata-release-readiness-gate/test.js
node repository-metadata-release-readiness-gate/demo.js
```

Generated outputs are written to `repository-metadata-release-readiness-gate/reports/`.

## Why this is distinct

This does not duplicate repository ledger, merge queue, restore rehearsal, DOI tombstone, access review, environment drift, notebook replay, release embargo, structured diff, or API export slices. It focuses specifically on checks repository metadata completeness before public scientific release.
