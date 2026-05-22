# AI Compute Idempotency Meter Guard

This module is a self-contained Revenue Infrastructure slice for SCIBASE issue #20. It protects AI compute billing from retry double-billing, raw-count inflation, and ambiguous nondeterministic reproducibility rerun charges before finance posts revenue.

The module uses synthetic data only and has no external dependencies.

## What It Checks

- Content-hash idempotency keys collapse retry rows even when `requestId` changes.
- Orphaned tool calls are held until a matching terminal result or refund policy exists.
- Raw event counts are compared with distinct account/source/day attribution counts.
- Nondeterministic reproducibility reruns are held unless billing scope is explicit.
- Account-level quota and prepaid top-up controls decide whether clean usage is covered, overage-billable, or held.
- Finance receives deterministic meter rows, findings, account decisions, and an audit digest.

## Run

```bash
npm run check
npm test
npm run demo
```

Generated review artifacts are written to `reports/`, including the short H.264 demo video at `reports/demo.mp4`.
