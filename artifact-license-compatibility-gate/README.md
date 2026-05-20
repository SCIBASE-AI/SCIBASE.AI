# Artifact License Compatibility Gate

This focused slice adds an artifact license compatibility gate for Scientific/Engineering Data & Code Hosting in issue #14.

It checks release manifests before publication and blocks incompatible dataset, code, model, or supplement licenses from being shipped under the wrong terms.

## What it checks

- Commercial-use restrictions.
- Required attribution.
- Redistribution permission.
- Copyleft and target-license conflicts.
- Missing source URLs.
- Release-wide policy receipts.

## Run it

```bash
node artifact-license-compatibility-gate/test.js
node artifact-license-compatibility-gate/demo.js
```

Generated JSON, Markdown, SVG, and `demo.webm` outputs live in `artifact-license-compatibility-gate/reports/`.

## Why this is distinct

This is not a FAIR manifest, artifact package integrity checker, preview cache guard, raw-instrument preview guard, notebook preview gate, retention/tombstone ledger, environment drift gate, provenance-chain validator, quarantine/rerun workflow, quota guard, or model-weight lineage gate. It focuses specifically on release license compatibility.
