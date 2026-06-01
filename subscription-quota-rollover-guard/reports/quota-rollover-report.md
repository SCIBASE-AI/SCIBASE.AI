# Subscription Quota Rollover Guard: LAB-QUOTA-1042

Billing cycle: **2026-06**
Decision: **hold-invoice**
Risk score: **100/100**

Findings: 6 blockers, 1 warnings.
Applied rollover units: 3900
Expected overage units: 1300

## BLOCK: DOWNGRADE_CARRY_LIMIT_EXCEEDED
A downgraded account is applying more carried quota than the downgrade policy allows.

Evidence: `{"planChangedFrom":"Lab Pro","planChangedTo":"Individual Pro","rolloverAppliedUnits":3900,"downgradeCarryLimitUnits":1000}`

Remediation: Apply the downgrade carry limit or hold the invoice for contract review.

## BLOCK: DUPLICATE_ROLLOVER_LOT
The same rollover lot appears more than once and could be carried forward twice.

Evidence: `{"lotId":"duplicate-may"}`

Remediation: Deduplicate rollover lots by immutable lot id before invoice generation.

## BLOCK: EXPIRED_ROLLOVER_APPLIED
Expired quota was applied to the current invoice.

Evidence: `{"lotId":"legacy-feb","expiresAfterCycle":"2026-04","billingCycle":"2026-06","appliedUnits":900}`

Remediation: Remove expired lots from available balance and route the invoice to finance review.

## BLOCK: MISSING_FINANCE_HOLD
The invoice preview is not on hold despite quota rollover blockers.

Evidence: `{"reviewerHold":false}`

Remediation: Place the invoice on finance hold until quota carry-forward and overage lines reconcile.

## BLOCK: OVERAGE_DOUBLE_BILLING_RISK
Invoice overage units do not subtract applied rollover correctly.

Evidence: `{"usageUnits":11200,"includedUnits":6000,"rolloverAppliedUnits":3900,"invoiceOverageUnits":5200,"expectedOverageUnits":1300}`

Remediation: Recompute overage after rollover application to prevent double billing.

## BLOCK: ROLLOVER_CAP_EXCEEDED
Prior-cycle unused quota exceeds the contractual rollover cap.

Evidence: `{"carryForwardUnits":3900,"rolloverCapUnits":3000}`

Remediation: Clamp carry-forward units to the plan cap and regenerate the invoice preview before release.

## WARN: UNAPPROVED_NEGATIVE_ADJUSTMENT
Negative quota adjustments exist without finance approval.

Evidence: `{"adjustmentIds":["manual-negative-1"]}`

Remediation: Require finance approval before negative units affect quota or invoice totals.
