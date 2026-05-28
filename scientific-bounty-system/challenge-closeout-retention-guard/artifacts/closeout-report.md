# Challenge Closeout Retention Guard

Decision: hold-closeout
Risk score: 32

## Severity Counts

| Severity | Count |
| --- | ---: |
| critical | 2 |
| high | 6 |
| medium | 2 |
| low | 0 |

## Challenge Summary

| Challenge | Outcome | Days Since Close |
| --- | --- | ---: |
| Regional climate downscaling model prize | awarded | 8 |
| Private oncology biomarker discovery challenge | awarded | 14 |
| Quantum noise mitigation prototype | cancelled | 3 |

## Findings

### CRITICAL: active-data-room-access-after-closeout
Challenge: Private oncology biomarker discovery challenge
Evidence: solver-team-beta still has solver access to sponsor-rnaseq-training-cohort 14 days after closeout; policy requires revocation within 2 days.
Action: Revoke access, rotate shared credentials, and record the revocation event before closeout is accepted.

### HIGH: restricted-data-disposition-missing
Challenge: Private oncology biomarker discovery challenge
Evidence: sponsor-rnaseq-training-cohort is restricted and has no destruction, return, or legal-hold disposition.
Action: Collect a destruction certificate, return receipt, or legal-hold order for the restricted dataset.

### HIGH: destruction-evidence-missing
Challenge: Private oncology biomarker discovery challenge
Evidence: sponsor-clinical-labels is marked destroyed without a certificate or audit evidence identifier.
Action: Attach the destruction certificate hash or reviewer-verifiable evidence identifier.

### CRITICAL: ip-transferred-before-funded-settlement
Challenge: Private oncology biomarker discovery challenge
Evidence: IP status is transferred while settlement status is pending.
Action: Reverse the transfer state or block sponsor use until funded settlement is recorded.

### HIGH: appeal-record-retention-too-short
Challenge: Private oncology biomarker discovery challenge
Evidence: Appeal records are retained for 32 days, below the 60-day policy.
Action: Extend arbitration and appeal record retention before deleting review evidence.

### HIGH: private-challenge-disclosure-unredacted
Challenge: Private oncology biomarker discovery challenge
Evidence: Public disclosure is enabled for a private challenge without approved redactions.
Action: Block announcement until sponsor data, solver trade secrets, and reviewer identities are redacted.

### MEDIUM: closeout-audit-digest-unsigned
Challenge: Private oncology biomarker discovery challenge
Evidence: Closeout audit digest status is draft.
Action: Sign the closeout digest after revocation, retention, and settlement checks complete.

### HIGH: cancelled-challenge-compensation-missing
Challenge: Quantum noise mitigation prototype
Evidence: The challenge was cancelled after work started, but no partial-compensation decision is recorded.
Action: Record partial compensation, refund, or no-compensation rationale before final closeout.

### HIGH: appeal-record-retention-too-short
Challenge: Quantum noise mitigation prototype
Evidence: Appeal records are retained for 11 days, below the 30-day policy.
Action: Extend arbitration and appeal record retention before deleting review evidence.

### MEDIUM: closeout-audit-digest-unsigned
Challenge: Quantum noise mitigation prototype
Evidence: Closeout audit digest status is unsigned.
Action: Sign the closeout digest after revocation, retention, and settlement checks complete.

## Closeout Actions

- Approve redactions before publishing private-challenge outcomes.
- Collect destruction, return, or legal-hold evidence for restricted sponsor datasets.
- Gate IP transfer and sponsor use until funded settlement is recorded.
- Publish solver-facing closeout rationale and compensation decisions.
- Retain arbitration records through the policy appeal window.
- Revoke stale data-room and reviewer access, then rotate shared challenge credentials.
