# Compute Meter Replay Guard - REV-METER-001

Decision: HOLD

## Severity Counts

- Critical: 3
- High: 4
- Medium: 1
- Low: 0

## Findings

### [CRITICAL] duplicate-idempotency-key
- Events: E-001, E-002
- Evidence: Idempotency key lab-pro:run-77:chunk-1 appears 2 times over 0.0 hours.
- Remediation: Bill only the first accepted event and quarantine replay duplicates before invoice lines are generated.

### [CRITICAL] duplicate-invoice-line
- Events: E-007, E-008
- Evidence: Invoice line line-502 is referenced by 2 events.
- Remediation: Hold the invoice run and regenerate invoice-line mapping from accepted meter events.

### [CRITICAL] unauthorized-negative-adjustment
- Events: E-004
- Evidence: E-004 applies -2400 cents with role support-agent.
- Remediation: Require finance or meter-admin approval before applying a negative adjustment.

### [HIGH] entitlement-plan-mismatch
- Events: E-005
- Evidence: E-005 was metered as individual-pro, but account acct-institution is on institution.
- Remediation: Reprice the event under the account's active plan or hold invoice release.

### [HIGH] missing-idempotency-key
- Events: E-006
- Evidence: E-006 has no idempotency key.
- Remediation: Reject or enrich the event before it can create an invoice line.

### [HIGH] source-sequence-gap
- Events: E-002, E-003
- Evidence: acct-lab-pro:usage-api jumps from sequence 101 to 104.
- Remediation: Check replay source logs for missing usage before releasing invoice totals.

### [HIGH] stale-correction
- Events: E-004
- Evidence: E-004 correction age is 167.1 hours.
- Remediation: Route old corrections through a manual reprice or credit memo review.

### [MEDIUM] timestamp-ordering
- Events: E-006
- Evidence: E-006 was received before it occurred.
- Remediation: Normalize source clocks or hold the event from invoice release.

## Finance Prompts

- Which replay jobs can create duplicate invoice lines, and where should idempotency be enforced?
- Which meter source logs prove whether missing sequence numbers represent lost usage or skipped test events?
- Which correction approvals should route to credit memo review instead of automatic invoice repricing?
- Which account plan snapshot should be used as the billable source of truth for this invoice run?
