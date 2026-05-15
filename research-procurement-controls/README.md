# Research Procurement Controls

This self-contained module implements an institutional procurement and revenue-control layer for SCIBASE issue #20. It focuses on the part of revenue infrastructure that research institutions need before approving paid compute, storage, analytics licensing, or subscription spend against grants and cost centers.

The module is deterministic, dependency-free, credential-free, and safe to run locally.

## What It Covers

- Purchase-order approval routing by amount and role.
- Grant and cost-center budget utilization checks.
- Budget holds when spend would cross policy thresholds.
- Blockers for expired budgets, missing contracts, inactive contracts, or overspend.
- Usage-event to invoice-line reconciliation for AI compute and institutional services.
- Detection of mismatched invoices, orphaned invoice lines, and unbilled usage events.
- Contract readiness review for SLA and data-processing metadata.
- Redacted, deterministic audit exports with SHA-256 digests for finance review.

## Local Verification

```bash
npm run check
npm test
npm run demo
```

Expected demo shape:

```text
Institution: Northstar Research Institute
Purchase orders: hold=2, blocked=1
Budget status: watch=2
Invoices: matched=1, mismatch=1, orphaned-invoice=1
```

## Files

- `src/procurement-controls.js` - procurement, budget, invoice, contract, and audit export engine.
- `data/sample-procurement-ledger.json` - sample institutional ledger with held, blocked, matched, mismatched, and orphaned cases.
- `test/procurement-controls.test.js` - Node test coverage for approvals, budget holds, invoice reconciliation, budget summaries, and digest determinism.
- `scripts/demo.js` - CLI demo for reviewers.
- `docs/requirement-map.md` - issue #20 requirement mapping.
- `docs/demo.svg` and `docs/demo.mp4` - visual demo artifacts for PR review.
