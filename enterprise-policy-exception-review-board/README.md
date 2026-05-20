# Enterprise Policy Exception Review Board

This self-contained slice gives institutional admins a deterministic review board for policy exceptions across exports, integrations, restricted datasets, and compute tooling.

It checks required approvals, expiry, compensating controls, owner accountability, and emits webhook-ready event bases for enterprise systems.

## Run locally

```bash
node enterprise-policy-exception-review-board/test.js
node enterprise-policy-exception-review-board/demo.js
```

Demo outputs are written to `enterprise-policy-exception-review-board/demo-output/`.
