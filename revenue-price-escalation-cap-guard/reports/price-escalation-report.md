# Revenue Price Escalation Cap Guard

Status: **hold**

## Summary

- Renewals checked: 5
- Release: 1
- Review: 1
- Hold: 3
- Current ARR reviewed: $50800.00
- Proposed ARR reviewed: $54060.00

## Decisions

- ren-clean-cpi: release (none)
- ren-over-cap: hold (CONTRACT_CAP_EXCEEDED, UPLIFT_ABOVE_CPI_AND_CAP)
- ren-stale-cpi: review (STALE_CPI_EVIDENCE)
- ren-late-notice: hold (NOTICE_WINDOW_SHORT)
- ren-price-locked: hold (PRICE_LOCK_ACTIVE, EXCLUDED_ACCOUNT_APPROVAL_REVIEW)

## Scope

This guard supports SCIBASE revenue operations by holding or routing institutional renewal price escalations before invoice release when contract caps, CPI evidence, notice windows, price locks, or exception approvals need attention.
