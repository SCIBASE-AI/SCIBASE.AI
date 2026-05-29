# Revenue Dunning and Entitlement Hold Report

Batch: revenue-dunning-2026-05-29
Generated: 2026-05-29T15:04:00.000Z

## Summary

- Accounts evaluated: 4
- Kept active: 1
- Finance exceptions: 1
- Entitlement holds: 2
- Findings: 7

## Decisions

### acct-lab-1

- Decision: keep-active
- Findings: none
- Actions: keep entitlements active; allow queued exports

### acct-inst-2

- Decision: finance-exception
- Findings: analytics license export queued for unpaid account; institutional invoice should route to finance exception workflow
- Actions: route to institutional billing desk; pause analytics export until invoice evidence is attached

### acct-ai-3

- Decision: hold-entitlements
- Findings: retry limit exceeded; active entitlement beyond grace window; compute credits should be held after repeated payment failure
- Actions: hold risky entitlements; pause compute credits or exports; send remediation notice

### acct-api-4

- Decision: hold-entitlements
- Findings: missing day-7 dunning notice; analytics license export queued for unpaid account
- Actions: hold risky entitlements; pause compute credits or exports; send remediation notice
