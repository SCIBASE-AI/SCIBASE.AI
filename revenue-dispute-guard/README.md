# Revenue Dispute Guard

Self-contained milestone for SCIBASE.AI issue #20, Revenue Infrastructure.

This module evaluates payment disputes, failed payment recovery, AI compute
overages, top-up velocity, and licensing export readiness before revenue is
recognized or entitlements are extended. It is synthetic-data-only and has no
network calls, credentials, or payment-provider dependencies.

## What It Covers

- Chargeback and open-dispute risk scoring for subscription accounts.
- AI compute overage and rapid top-up abuse detection.
- Entitlement hold decisions for past-due or disputed accounts.
- Invoice reserve recommendations and revenue adjustment packets.
- Dunning, payment-method, procurement, and account-review actions.
- Privacy-safe licensing export gates with consent and aggregation checks.
- Stable audit digests for finance review packets.

## Files

- `index.js` - revenue dispute and adjustment guard engine.
- `demo.js` - terminal demo for finance guard packets.
- `test.js` - dependency-free regression tests.
- `demo.mp4` - short demo artifact for bounty review.

## Run

```sh
node revenue-dispute-guard/test.js
node revenue-dispute-guard/demo.js
```

## Requirement Map

| Issue #20 Requirement | Implementation |
| --- | --- |
| Tiered subscription billing | Account packets include plan, recurring revenue, invoice status, entitlement decisions, and reserve actions. |
| Usage-based AI compute billing | Compute spend, budget, and top-up velocity feed risk scores and usage hold recommendations. |
| Payment integrations and invoicing | Payment failures, chargebacks, dunning actions, and institutional invoice reserves are modeled without live provider calls. |
| Data licensing APIs and analytics | Licensing exports are gated by anonymization, consent coverage, and aggregation thresholds. |
| Predictable recurring revenue | Portfolio packets surface held ARR/MRR, reserve totals, risk tiers, and audit digests for finance review. |
| Compliance and auditability | Every account packet includes evidence factors, recovery actions, revenue adjustments, and stable audit digests. |
