# Payment Rail Failover Review Packet

Audit digest: `94dfda0dfa1a91898345`

## Summary

- Total invoices reviewed: 6
- Fallback releases: 4
- Findings raised: 10
- Release with fallback: 1
- Hold for review: 1
- Block: 3

## Invoice Decisions

| Invoice | Decision | Selected rail | Fallback | Findings |
| --- | --- | --- | --- | --- |
| inv-alpha-subscription-001 | release_with_fallback | institutional_invoice | yes | primary_rail_unavailable |
| inv-eu-compute-topup-002 | hold_for_review | institutional_invoice | yes | primary_rail_unavailable, missing_fallback_finance_approval, missing_customer_notice |
| inv-gov-license-003 | release | institutional_invoice | no | none |
| inv-solo-topup-004 | block | none | no | primary_rail_unavailable, no_compatible_fallback_rail |
| inv-duplicate-a | block | institutional_invoice | yes | duplicate_idempotency_key, primary_rail_unavailable |
| inv-duplicate-b | block | institutional_invoice | yes | duplicate_idempotency_key, primary_rail_unavailable |

## Reviewer Notes

This packet uses synthetic data only. It demonstrates the control boundary between
subscription billing, AI compute top-ups, analytics licensing, and payment rail
operations during a processor outage or rail restriction.
