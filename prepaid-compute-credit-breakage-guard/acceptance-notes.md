# Acceptance Notes

This contribution intentionally does not create live payment links, invoices, subscriptions, or provider integrations. It is a self-contained control module that can be reviewed without credentials.

Acceptance checks:

- `npm run check` validates all JavaScript files.
- `npm test` covers breakage-ready lots, missing-notice holds, refund liabilities, expiring-soon notices, protected grant credits, active usable credits, and deterministic audit digests.
- `npm run demo` writes reviewer artifacts to `reports/`.
- The PR includes a short demo video generated from the SVG summary.

Non-overlap:

- Not a generic billing ledger.
- Not a usage metering/idempotency guard.
- Not payment webhook or payment rail failover logic.
- Not collections, dispute evidence, tax exemption, plan-proration, storage overage, or account-transfer work.
- Focused only on prepaid AI compute credit breakage and expiration controls.
