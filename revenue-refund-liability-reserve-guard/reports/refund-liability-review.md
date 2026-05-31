# Revenue Refund Liability Reserve Report

Generated: 2026-05-31T00:00:00.000Z
Audit digest: 6c51ddbe808a1a8cacb81a52cfd1e832b78f82bbfc31c0e4df4bb16a373022af

## Summary

- Refund packets: 4
- Approve: 0
- Approve with adjustments: 2
- Hold: 2
- Requested refund: 11100
- Refundable amount: 9498
- Reserve draw: 9498
- Held refunds: 7600

## Decisions

### refund:annual-pro-cancel-clean

- Customer: Northbridge Lab
- Stream: subscription
- Decision: approve_with_adjustments
- Requested refund: 900 USD
- Refundable amount: 938 USD
- Reserve after: 262 USD
- Blockers: none
- Warnings: processor fee 34 USD is non-refundable
- Actions: approve refund for payment queue; record reserve draw and revenue reversal
- Digest: 39dbf4dd893713fc64b55d5d5ef6de4669a088120c01b5074ec3ed851de81155

### refund:institutional-invoice-missing-po

- Customer: East Valley University
- Stream: institutional_invoice
- Decision: hold
- Requested refund: 7000 USD
- Refundable amount: 6200 USD
- Reserve after: -1200 USD
- Blockers: missing evidence: entitlement-rollback, finance-approval, po-or-invoice-evidence; approval status is pending; entitlements are not rolled back; refund reserve short by 1200 USD
- Warnings: requested refund exceeds unused service value by 800 USD
- Actions: hold refund until evidence packet is complete; route to finance approver before cash release; rollback entitlements before refund release; cap refundable service amount at unused value; top up refund reserve before release
- Digest: 7705b511278e5888ce93be1264ae43da26dd26d8c441be69fbef7d6e50c351d1

### refund:compute-credit-over-request

- Customer: Helix AI Core
- Stream: ai_compute
- Decision: approve_with_adjustments
- Requested refund: 2600 USD
- Refundable amount: 1815 USD
- Reserve after: 585 USD
- Blockers: none
- Warnings: requested refund exceeds unused service value by 700 USD; processor fee 85 USD is non-refundable
- Actions: cap refundable service amount at unused value; approve refund for payment queue; record reserve draw and revenue reversal
- Digest: f8c6f3e25b3e20063c04d6ff23ce2c88a6a2975967f406763ccd19049e41aa49

### refund:restricted-grant-compute

- Customer: Civic Bio Grant
- Stream: ai_compute
- Decision: hold
- Requested refund: 600 USD
- Refundable amount: 545 USD
- Reserve after: 455 USD
- Blockers: missing evidence: grant-refund-approval; restricted grant-funded compute lacks refund approval
- Warnings: processor fee 55 USD is non-refundable
- Actions: hold refund until evidence packet is complete; hold refund for grant compliance review
- Digest: adda46759e57cf7997019364e7c8467be44025f767d05debfcf68a612fa8798d
