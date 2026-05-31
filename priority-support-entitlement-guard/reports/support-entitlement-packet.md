# Priority Support Entitlement Guard

Program: Revenue infrastructure premium support routing
Decision: hold-priority-support-routing

## Summary

- Cases checked: 4
- Blockers: 3
- Holds: 5
- Allowed priority cases: 1
- Standard routed cases: 0
- Billable overage: $340.00

## Case Decisions

- allow-priority-support: case-enterprise-p1-clean (institution-enterprise, p1, enterprise)
- hold-premium-support: case-lab-unpaid-priority (individual-pro, p1, standard)
- allow-with-overage-billing: case-lab-overage-approved (lab-plus, p2, priority)
- hold-premium-support: case-government-sensitive-hold (government-enterprise, p1, enterprise)

## Findings

- BLOCKER priority-support-not-entitled (case-lab-unpaid-priority): Case requests paid priority handling but the account lacks a premium plan or support add-on.
- BLOCKER unpaid-invoice-premium-hold (case-lab-unpaid-priority): Unpaid invoices exceed the hold threshold for premium support handling.
- HOLD requester-not-on-support-roster (case-lab-unpaid-priority): Requester is not on the paid support roster or institution-admin role.
- HOLD requested-sla-exceeds-entitlement (case-lab-unpaid-priority): Requested SLA response is faster than the account entitlement allows.
- HOLD support-overage-approval-missing (case-lab-unpaid-priority): Support minutes would exceed the paid allowance without overage approval.
- HOLD requested-sla-exceeds-entitlement (case-government-sensitive-hold): Requested SLA response is faster than the account entitlement allows.
- BLOCKER sensitive-data-routing-missing (case-government-sensitive-hold): Sensitive support case is missing secure routing approval before premium handling.
- HOLD enterprise-escalation-approval-missing (case-government-sensitive-hold): Enterprise escalation was requested without an approval record.

## Remediation

- Route non-entitled cases to standard support or require a paid support add-on.
- Hold premium handling until finance clears unpaid invoices or grants an exception.
- Ask an institution admin to add the requester to the paid support roster.
- Adjust the SLA target to the account tier or record an approved paid escalation.
- Send sensitive cases through the approved restricted-data support queue before engineering access.
- Attach an enterprise escalation approval before using premium escalation resources.
- Collect overage approval or defer non-urgent support work until the next included allowance period.
