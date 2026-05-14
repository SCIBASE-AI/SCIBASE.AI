# Institutional Revenue Controls

Self-contained Revenue Infrastructure module for SCIBASE issue #20. It focuses on the institutional procurement and finance-control layer: purchase orders, grant budgets, invoice routing, usage reconciliation, SLA contract metadata, licensing exports, and audit evidence.

## Scope

- Institutional contract metadata for annual enterprise plans, payment rails, SLA tier, included compute credits, and licensed seats.
- Purchase order validation with status, expiry, remaining balance, cost centers, and approvers.
- Grant and cost-center budgets with warning and hard-limit thresholds.
- Usage event pricing for AI compute, private seats, and literature-analysis packs.
- Invoice reconciliation that compares invoice lines to usage events and purchase-order capacity.
- Approval routes for PIs and finance admins with limits and pending states.
- Budget threshold holds for overspend prevention.
- Licensing export pipeline summaries for anonymized analytics revenue.
- Finance audit export with deterministic evidence hashes.
- Local API endpoints and tests for reviewer validation.

No payment processor, database, or external accounting system is required. The module runs from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4363 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4363/api/health
curl -fsS http://localhost:4363/api/validate
curl -fsS http://localhost:4363/api/dashboard
curl -fsS 'http://localhost:4363/api/invoice?id=inv-2026-05-draft'
curl -fsS 'http://localhost:4363/api/approval-route?id=inv-2026-05-draft'
curl -fsS http://localhost:4363/api/audit-export
```

## Demo Flow

1. Open `/api/dashboard` to inspect the institutional plan, budget states, invoice controls, revenue pipeline, and holds.
2. Open `/api/invoice?id=inv-2026-05-draft` to reconcile invoice lines against priced usage events and budget holds.
3. Open `/api/approval-route?id=inv-2026-05-draft` to see PI and finance-admin approval status.
4. Open `/api/audit-export` to review deterministic evidence hashes for PO, invoice, budget, and licensing controls.

See `docs/requirement-map.md` for issue requirement coverage.
