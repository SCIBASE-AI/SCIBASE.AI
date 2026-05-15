# Requirement Map

This module targets SCIBASE issue #20, Revenue Infrastructure, with a focused institutional procurement and revenue-control milestone.

| Issue requirement area | Implementation |
| --- | --- |
| Tiered subscription and institutional billing controls | `src/procurement-controls.js` evaluates purchase-order approval thresholds and grant-budget holds before spend can be committed. |
| AI compute usage metering | Usage events are reconciled by units, unit cost, purchase order, and grant budget in `reconcileInvoices`. |
| Top-ups and budget hold logic | Budget summaries include committed spend, held commitments, usage exposure, remaining balance, utilization, and watch status when policy thresholds are crossed. |
| Institutional invoice approval routing | Purchase orders require role-based approvals by amount, and invoice lines are classified as matched, mismatched, or orphaned. |
| Anonymized analytics licensing readiness | Audit exports are redacted, deterministic, digest-backed, and include a requirement coverage manifest for reviewer handoff. |
| Enterprise contracts and SLA metadata | Contract review flags missing SLA tiers, missing data processing terms, expired renewals, and procurement readiness. |

## Verification

```bash
npm run check
npm test
npm run demo
```

The sample ledger intentionally includes healthy, held, blocked, mismatched, and orphaned cases so reviewers can see each control state without external credentials.
