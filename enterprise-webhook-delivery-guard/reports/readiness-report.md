# Enterprise Webhook Delivery Guard

Workspace: Institutional Webhook Delivery
Digest: sha256:e15b0a6c64825f3e6440359b5b9952ec6c8d7abe65f13cf9806b3187a18c1701

## Summary

- Ready subscribers: 1
- Held subscribers: 1

## Subscribers

### research-office

- Decision: ready
- Retry strategy: exponential
- Recent successes: 3
- Last failure age: 12 minutes
- Holds: none
- Redacted failure payload: delivery failed for [redacted-email] after 1 timeout

### legacy-sis

- Decision: hold
- Retry strategy: fixed
- Recent successes: 0
- Last failure age: 180 minutes
- Holds: missing-owner, missing-idempotency-key, retry-strategy-not-exponential, retry-budget-exceeds-policy, missing-dead-letter-route, recent-success-window-insufficient, failure-age-exceeds-window
- Redacted failure payload: token=[redacted] email [redacted-email]
