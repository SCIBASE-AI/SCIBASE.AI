# Analytics Data Product Freshness Guard

This module is a focused Revenue Infrastructure slice for SCIBASE issue #20. It validates recurring licensed analytics data products before monthly invoice release, after entitlement checks but before finance sends the bill.

The guard checks:

- contracted refresh cadence against snapshot age and delivery date
- required metric coverage for customer-facing analytics products
- anonymization threshold coverage before billing for licensed data views
- source-project withdrawal and embargo impacts on deliverable coverage
- reproducibility-score feed freshness for billed analytics products
- customer-facing delivery evidence for exports, portals, and dashboards
- deterministic invoice, credit, defer, or hold recommendations

It is intentionally separate from generic billing ledgers, usage meters, payment webhooks, payment failover, tax and VAT checks, FX settlement, quote approvals, invoice delivery, collections, storage overage, prepaid compute credits, analytics API usage gates, analytics seat rosters, customer consolidation, renewal/cancellation checks, price-escalation caps, and support entitlement guards. This slice focuses only on whether a licensed analytics data product is fresh and complete enough to bill.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

Generated reviewer artifacts:

- `reports/clean-freshness-packet.json`
- `reports/risky-freshness-packet.json`
- `reports/freshness-review-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.mp4`

## Safety

All fixtures are synthetic. The module does not call private research projects, uploaded datasets, live analytics stores, customer portals, billing systems, payment processors, credential stores, external APIs, payout systems, or financial accounts.
