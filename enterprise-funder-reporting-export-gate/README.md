# Enterprise Funder Reporting Export Gate

This module is a self-contained Enterprise Tooling slice for institutional research administrators. It evaluates whether a research project is ready to be exported to funder and repository reporting channels.

It uses synthetic data only and has no external dependencies.

## What It Checks

- Funder mandate evidence is present.
- Open-access status or embargo evidence is clear.
- Reproducibility scores meet the institutional threshold.
- Manuscript, dataset, code, and metadata artifacts have hashes and licenses.
- Repository routing matches funder expectations.
- Webhook-ready governance events receive deterministic signatures.

## Run

```bash
node enterprise-funder-reporting-export-gate/test.js
node enterprise-funder-reporting-export-gate/demo.js
```

## Files

- `index.js` contains the evaluator, export packet builder, and webhook event signer.
- `test.js` validates ready, blocked, warning, routing, artifact, portfolio, and digest behaviour.
- `demo.js` prints an admin-style readiness table plus webhook event payloads.
- `requirements-map.md` maps the issue requirements to implementation coverage.
- `acceptance-notes.md` describes how this slice fits issue 19.
