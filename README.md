# deepevents.ai
deepevents.ai main codebase

## Revenue infrastructure controls

- `trial-promotion-abuse-guard/` checks free-trial reuse, coupon stacking,
  consortium discount eligibility, and trial-to-paid readiness before discount
  leakage reaches invoice-facing revenue.
