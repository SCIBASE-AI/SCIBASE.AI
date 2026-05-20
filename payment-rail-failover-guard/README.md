# Payment Rail Failover Guard

This module is a self-contained Revenue Infrastructure slice for issue #20. It
checks whether subscription invoices, AI compute top-ups, and analytics licensing
charges can be safely released when a primary payment rail is degraded,
restricted, or unavailable.

The implementation is dependency-free and uses synthetic data only. It does not
connect to Stripe, PayPal, banks, or live customer systems.

## What it evaluates

- Primary rail readiness for Stripe card, PayPal, ACH, and institutional invoice
  paths.
- Fallback rail compatibility by region, currency, revenue stream, amount, and
  purchase order evidence.
- Duplicate charge prevention through idempotency-key checks.
- Finance approval, customer notice, reconciliation owner, and settlement-window
  requirements before fallback release.
- Deterministic audit digests for reviewer and finance evidence packets.

## Run locally

```bash
node payment-rail-failover-guard/test.js
node payment-rail-failover-guard/demo.js
```

The demo writes:

- `rail-failover-report.json`
- `finance-review-packet.md`
- `demo.svg`
- `demo.mp4`, generated from the rendered SVG preview

## Revenue Infrastructure fit

The issue calls out secure payment integrations, subscription billing, AI compute
top-ups, and institutional invoicing. This module focuses on the operational
control layer between those systems: deciding when revenue can still be collected
or must be held during a payment rail failure.
