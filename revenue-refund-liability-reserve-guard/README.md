# Revenue Refund Liability Reserve Guard

This module adds a focused refund liability reserve guard for the Revenue
Infrastructure bounty. It evaluates whether subscription, institutional
invoice, and compute-credit refund requests are financially safe before cash
leaves the platform or entitlements are reversed.

## Scope

The guard checks synthetic refund packets for:

- annual subscription refund eligibility and proration
- institutional invoice reversal evidence and approval status
- unused AI compute credit refund treatment
- non-refundable processor fees and tax handling
- entitlement rollback readiness before cash release
- refund evidence completeness
- reserve sufficiency by revenue stream and currency
- reviewer actions for hold, approve, or manual finance review decisions

This is not a generic quote approval, billing readiness, payment rail,
dunning, dispute, tax exemption, proration, prepaid credit breakage, or
collections module. It focuses specifically on refund liability exposure and
reserve sufficiency before money is returned.

## Issue #20 Requirement Mapping

- Tiered subscription billing: evaluates subscription refunds, annual-plan
  proration, cancellation terms, and entitlement rollback readiness.
- AI compute billing: checks unused compute-credit refund requests against
  consumed usage, restricted grants, and available reserve coverage.
- Institutional invoicing: validates invoice reversal approvals, PO evidence,
  and tax/processor fee treatment.
- Revenue operations: emits deterministic finance review packets, reserve
  impact, audit digests, and curator actions for revenue teams.

## Validation

```bash
node revenue-refund-liability-reserve-guard/test.js
node revenue-refund-liability-reserve-guard/demo.js
node revenue-refund-liability-reserve-guard/render-video.js
node --check revenue-refund-liability-reserve-guard/index.js
node --check revenue-refund-liability-reserve-guard/sample-data.js
node --check revenue-refund-liability-reserve-guard/test.js
node --check revenue-refund-liability-reserve-guard/demo.js
node --check revenue-refund-liability-reserve-guard/render-video.js
git diff --check
```
