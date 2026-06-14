# Enterprise cost center chargeback report

## CB-1001: Neuroscience lab
Amount: 4200
Decision: APPROVE_CHARGEBACK
Next step: post the chargeback to the institution ledger

## CB-1002: Materials group
Amount: 9600
Decision: ROUTE_FOR_APPROVAL
Next step: send to finance for a manual approval pass
Warnings:
- charge exceeds remaining budget but has overage approval
- no purchase order attached

## CB-1003: Clinical data unit
Amount: 3100
Decision: BLOCK_CHARGEBACK
Next step: do not post until blockers are fixed
Blockers:
- inactive cost center
- missing PI approval
- expense category not allowed
- missing usage evidence
- data residency mismatch
Warnings:
- no purchase order attached
- missing tax code
