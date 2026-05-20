# Sensitive File Redaction Release Gate

This focused slice adds blocks data/code artifacts that contain sensitive file patterns before hosted release for issue #14.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node sensitive-file-redaction-release-gate/test.js
node sensitive-file-redaction-release-gate/demo.js
```

Generated outputs are written to `sensitive-file-redaction-release-gate/reports/`.

## Why this is distinct

This does not duplicate FAIR access, package integrity, preview cache, raw instrument preview, notebook preview, retention, model lineage, artifact license, provenance, quarantine, or quota slices. It focuses specifically on blocks data/code artifacts that contain sensitive file patterns before hosted release.
