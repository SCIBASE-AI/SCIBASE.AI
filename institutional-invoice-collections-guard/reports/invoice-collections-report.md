# Institutional Invoice Collections Guard Report

As of: 2026-05-22
Portfolio digest: `5f78f0c418a4597e8a9f6cdc1354582dd48548d2195a8066b6ca7fa58b88a171`

## Summary

- Invoices reviewed: 5
- Outstanding balance: USD 17400.00
- High-risk invoices: INV-SCI-2041
- Actions: collections_escalation_packet=1, pause_dunning_for_promised_pay=1, rate_limit_dunning=1, hold_collections_missing_acceptance=1, route_to_dispute_owner=1

## Invoice Decisions

| Invoice | Customer | Aging | Outstanding | Severity | Action | Entitlement treatment |
| --- | --- | --- | ---: | --- | --- | --- |
| INV-SCI-2041 | North Valley Research Office | 61-90 | USD 5000.00 | high | collections_escalation_packet | soft hold: pause new billable usage while preserving active research access |
| INV-SCI-2077 | Lakeside Methods Lab | 1-30 | USD 2000.00 | low | pause_dunning_for_promised_pay | keep entitlements active during promise grace window |
| INV-SCI-2099 | Regional Consortium BioHub | 31-60 | USD 6100.00 | medium | rate_limit_dunning | avoid new customer notices until cadence window resets |
| INV-SCI-2112 | Coastal Data Institute | 1-30 | USD 1800.00 | medium | hold_collections_missing_acceptance | do not restrict entitlements until acceptance is resolved |
| INV-SCI-2120 | Central Clinical Research Unit | 1-30 | USD 2500.00 | medium | route_to_dispute_owner | freeze dunning and preserve existing access until dispute owner decision |

## Guardrails

- Uses synthetic invoice, payment, dispute, promise-to-pay, and dunning records only.
- Does not call Stripe, PayPal, ACH, ERP, bank, wallet, or customer systems.
- Preserves active research continuity by recommending non-disruptive soft holds before access changes.
- Produces deterministic audit digests for finance review packets.
