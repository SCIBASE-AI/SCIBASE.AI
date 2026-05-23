# Requirements Map

Issue #20 asks for tiered subscriptions, payment processing, AI compute metering, top-ups, institutional invoices, anonymized analytics licensing, and revenue infrastructure.

This module covers the authorization boundary before charge attempts:

- Subscription billing: validates saved payment freshness before renewal charges.
- Payment processing: checks SCA/3DS and ACH/direct-debit authorization evidence before release.
- AI compute top-ups: blocks top-up charges when mandate scope or customer notice is missing.
- Institutional invoices and auto-pay: preserves finance review when autopay consent or mandate evidence is stale.
- Analytics licensing: validates amount and currency changes before license renewals are charged.
- Revenue controls: emits finance actions and stable audit digests before revenue or cash is posted.

## Non-Overlap

This is not another generic billing ledger, usage metering module, payment rail failover guard, payment webhook replay guard, collections or AR aging guard, dispute module, tax guard, FX settlement guard, plan-proration module, procurement control, invoice acceptance gate, storage overage guard, account-transfer guard, prepaid credit breakage guard, analytics API/seat roster guard, compute idempotency guard, or customer-consolidation guard.

The slice focuses specifically on whether the saved payment authorization is fresh enough to attempt a charge.
