# Challenge Withdrawal Reimbursement Handoff

Decision: escalate_withdrawal_dispute
Affected solvers: 3
Recommended reimbursement: $2586.00
Funded shortfall: $2286.00
Audit digest: sha256:af101fe0baa90544d8acc9069ccfa1524ccfc6c133806eeff1bb088088a48cb1

## Priority Findings

| Severity | Code | Remediation |
| --- | --- | --- |
| critical | CANCELLATION_AUTHORITY_MISSING | verify_sponsor_cancellation_authority_before_closeout |
| critical | DISPUTE_HOLD_WINDOW_TOO_SHORT | extend_dispute_hold_before_refund_or_closeout |
| critical | REIMBURSEMENT_RESERVE_SHORTFALL | fund_solver_reimbursement_reserve_before_releasing_sponsor_refund |
| high | APPEAL_DEADLINE_MISSING | set_solver_appeal_deadline_before_withdrawal_closeout |
| high | COST_CLAIM_EVIDENCE_MISSING | attach_cost_claim_evidence_before_reimbursement |
| high | COST_CLAIM_PATH_NOT_IN_NOTICE | include_solver_cost_claim_path_in_notice |
| high | MILESTONE_EVIDENCE_HASH_MISSING | hash_milestone_evidence_before_solver_cost_review |
| high | NONREFUNDABLE_RECEIPT_MISSING | attach_receipt_hash_for_nonrefundable_solver_spend |
| high | NONREFUNDABLE_RECEIPT_MISSING | attach_receipt_hash_for_nonrefundable_solver_spend |
| high | NONREFUNDABLE_RECEIPT_MISSING | attach_receipt_hash_for_nonrefundable_solver_spend |
| high | NOTICE_PARITY_GAP | restart_closeout_clock_after_equal_solver_notice |
| high | REIMBURSEMENT_DECISION_MISSING | record_solver_reimbursement_decision_before_challenge_closeout |

## Team Recommendations

### BNTY-WITHDRAW-RISK

| Team | Recommended | Recorded | Shortfall | Action |
| --- | ---: | ---: | ---: | --- |
| team-lovelace | $1449.00 | $500.00 | $949.00 | hold_and_reimburse_solver_costs |
| team-hopper | $634.00 | $0.00 | $634.00 | hold_and_reimburse_solver_costs |
| team-johnson | $503.00 | $0.00 | $503.00 | hold_and_reimburse_solver_costs |

