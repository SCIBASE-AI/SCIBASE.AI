# Institutional Account Transfer Revenue Guard

This module adds a narrow revenue-control slice for SCIBASE issue
[#20](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/20). It validates lab or
institutional account transfers before subscription ownership, AI compute
credits, and analytics-license entitlements move between organizations.

It is intentionally not another generic billing ledger, usage meter, payment
webhook, failover router, dispute workflow, SLA-credit module, tax/FX guard,
storage overage guard, trial/promotion guard, procurement workflow, invoice
acceptance flow, sanctions gate, consortium-pricing checker, or compute
idempotency meter. The focus is transfer-specific revenue leakage and
entitlement continuity.

## What It Checks

- Outstanding invoices and overdue balances before transfer release.
- Purchase-order transfer authority and budget-owner approval.
- Cross-domain SSO transfers with verified domain claim and admin signoff.
- Consortium discount eligibility and discount cap reset.
- Analytics-license assignment and requested-scope continuity.
- Compute-credit ownership, transferability, and near-expiry review.
- Effective-date proration for source credits and target charges.

## Local Usage

```bash
cd institutional-account-transfer-revenue-guard
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts under `reports/`:

- `transfer-revenue-packet.json`
- `transfer-revenue-report.md`
- `summary.svg`
- `demo.mp4`

All data is synthetic. The module does not call payment providers, does not
require API keys, and does not collect private financial or identity data.

## Result Model

Each transfer returns:

- `approve` when no blockers, warnings, or discount adjustments are present.
- `conditional` when finance can proceed after review or discount reset.
- `hold` when invoices, authority, license, SSO, or compute-credit ownership
  blocks are present.

Every decision includes a deterministic audit digest so reviewers can compare
packet changes during future edits.
