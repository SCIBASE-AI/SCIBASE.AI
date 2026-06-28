# Payment Dispute Evidence Guard Demo

Generated at: 2026-06-27T08:00:00Z

## Summary

- Total packets: 4
- Net amount at risk: $5800.00
- Overall decision: HOLD_RESPONSE
- Release: 1
- Review before response: 1
- Hold response: 2
- Findings: 10

## Packet Decisions

| Packet | Invoice | Processor case | Net risk | Decision | Findings |
| --- | --- | --- | ---: | --- | --- |
| DSP-1001 | INV-2026-0418 | chdp_91a7_release | $1200.00 | RELEASE_RESPONSE | none |
| DSP-1002 | INV-2026-0442 | chdp_91a7_hold | $2600.00 | HOLD_RESPONSE | RESPONSE_WINDOW_EXPIRED, MISSING_DISPUTE_EVIDENCE, SENSITIVE_RECEIPT_DATA, CUSTOMER_NOTICE_MISSING, DUPLICATE_PROCESSOR_CASE |
| DSP-1003 | INV-2026-0461 | chdp_91a7_credit | $0.00 | REVIEW_BEFORE_RESPONSE | DISPUTE_ALREADY_OFFSET |
| DSP-1004 | INV-2026-0490 | chdp_91a7_hold | $2000.00 | HOLD_RESPONSE | RESPONSE_WINDOW_URGENT, CUSTOMER_NOTICE_LATE, RECOGNIZED_REVENUE_EXCEEDS_RISK, DUPLICATE_PROCESSOR_CASE |

## Controls Covered

- Processor response deadline and urgency checks.
- Required evidence completeness for contract, invoice, delivery, usage, terms, communication, and redacted receipt.
- Prior refund and credit memo offsets to prevent duplicate recovery.
- Duplicate processor case detection across exported packets.
- Customer notice timing before response release.
- Sensitive receipt data redaction before finance exports.
