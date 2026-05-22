# Institutional Invoice Collections Guard

This module is a focused Revenue Infrastructure slice for SCIBASE.AI issue #20.
It evaluates issued institutional invoices after delivery or acceptance and
produces deterministic accounts-receivable aging decisions before finance teams
send dunning notices, apply soft entitlement holds, or route a write-off review.

The implementation is intentionally self-contained and synthetic-data-only. It
does not connect to payment processors, customer systems, ERPs, banks, wallets,
or live accounting data.

## Coverage

- Calculates outstanding balances from posted or settled payments only.
- Classifies invoices into current, settled, 1-30, 31-60, 61-90, and 90+ aging
  buckets.
- Blocks collections when delivery or customer acceptance evidence is missing.
- Routes unresolved disputes away from dunning.
- Pauses dunning when a promise-to-pay includes enough evidence and coverage.
- Rate-limits repeated dunning events.
- Recommends finance escalation, collections packets, or write-off/payment-plan
  review based on aging and risk.
- Preserves active research continuity by recommending non-disruptive soft holds
  before any access change.
- Emits deterministic audit digests for reviewer and finance packets.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/invoice-collections-packet.json`
- `reports/invoice-collections-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Bounty Non-Overlap

This is not another generic billing ledger, entitlement engine, metering module,
payment webhook handler, payment failover guard, dispute guard, SLA credit guard,
FX settlement checker, plan-proration module, contract-allocation engine,
sanctions/export-control checker, trial/promotion guard, storage overage module,
or account-transfer guard. It focuses specifically on institutional
accounts-receivable aging and collections sequencing after invoices are issued.
