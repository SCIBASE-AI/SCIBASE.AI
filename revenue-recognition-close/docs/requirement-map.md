# Requirement Map

This module contributes a focused month-end revenue recognition and collection-control slice for issue #20.

| Issue area | Covered by this module |
| --- | --- |
| Tiered subscription billing | Ratable recognition for annual subscription service periods, deferred-revenue carry-forward, collected cash tracking |
| AI compute billing | Usage-event recognition inside the close window, deferred unused invoice capacity, receivable tracking |
| Licensing APIs & analytics | Accepted-deliverable recognition for analytics licensing packages, deferred undelivered value, partial acceptance evidence |
| Institutional invoicing | Invoice due-date aging, accounts receivable at close, finance-owned dunning escalation |
| Revenue operations | Journal-entry packet, audit trail, close certification dashboard, credit/refund/collection holds |

## Distinctness

Existing submissions for #20 cover billing engines, entitlement decisions, metering ledgers, procurement controls, anomaly reconciliation, and privacy-safe analytics licensing gates. This module focuses on the finance close boundary after those systems emit invoices and usage/deliverable evidence:

- How much revenue is earned in the current close period
- What remains deferred after the period
- Which invoices remain receivable
- Which overdue accounts need dunning
- Which credit/refund/collectability risks should block close certification

## Verification

```bash
cd revenue-recognition-close
npm run check
npm test
npm run demo
```
