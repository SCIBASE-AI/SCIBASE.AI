# Acceptance Notes

## Scope

Adds a focused project invitation expiry and domain guard for issue #11.

## Non-overlap

This slice focuses on pre-acceptance guest invitation governance, not:

- broad workspace/RBAC ledgers
- privacy access review
- access-audit anomaly monitors
- member lifecycle/offboarding
- institutional recertification
- anonymous-review escrow
- identity merge workflows
- role delegation approval
- service-account governance

## Validation

Run:

```bash
node project-invitation-expiry-domain-guard/test.js
node project-invitation-expiry-domain-guard/demo.js
```

Expected result:

- Tests print `project invitation expiry/domain guard tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough of the invitation queue.
