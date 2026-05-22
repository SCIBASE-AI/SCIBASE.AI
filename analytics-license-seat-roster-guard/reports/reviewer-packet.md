# Analytics License Seat Roster Guard

Customer: Northbridge Research Consortium
Issue: SCIBASE-AI/SCIBASE.AI#20
Decision: block-renewal-until-seat-evidence-is-clean
Score: 0
Estimated revenue exposure: $8750

## Seat Counts

| Seat class | Active | Contracted |
| --- | ---: | ---: |
| dashboard | 5 | 4 |
| api | 2 | 2 |
| viewer | 3 | 5 |

## Findings

- **high / unapproved-seat-overage**: 5 active dashboard seats exceed the contracted 4 seat entitlement by 1.
  - Action: Hold renewal true-up until finance approves overage billing or seats are reclaimed.
  - Exposure: $1200
- **low / inactive-paid-seat**: liam.gray@northbridge.edu has not used analytics access since 2025-12-18.
  - Action: Queue the seat for renewal roster confirmation or reclaim before the true-up invoice.
  - Exposure: $1200
- **critical / unapproved-seat-domain**: visiting.pi@partner-lab.com uses domain partner-lab.com, which is outside the signed analytics license domains.
  - Action: Remove the seat or attach a signed domain addendum before renewal billing.
  - Exposure: $1200
- **medium / expired-temporary-access**: visiting.pi@partner-lab.com still has active access after temporary access expired on 2026-04-30.
  - Action: Disable the temporary seat or convert it into a paid named seat before renewal.
  - Exposure: $1200
- **high / api-usage-without-api-seat**: policy-api@northbridge.edu generated 1300 analytics API queries while assigned to a viewer seat.
  - Action: Reclassify the user to an API seat or remove API keys before billing the renewal period.
  - Exposure: $2750
- **medium / duplicate-named-seat**: maya.chen@northbridge.edu appears as 2 active named seats.
  - Action: Collapse duplicate identity records before seat counts are sent to finance.
  - Exposure: $1200

## Safety

- Synthetic roster and usage data only
- No Stripe, PayPal, bank, ACH, ERP, SSO, SCIM, or analytics provider calls
- No private customer data, payment credentials, tax IDs, or live invoice mutations
