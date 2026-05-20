# Requirements Map

| Issue #20 requirement | Implementation |
| --- | --- |
| Tiered subscription billing | The sample compares Enterprise to Team plan entitlements. |
| Usage-based pricing and quotas | Storage and compute commitments are checked before plan changes. |
| Predictable recurring revenue | Annual commitment and unpaid invoice holds prevent unsafe revenue downgrades. |
| Modular revenue infrastructure | `createDowngradeReviewPacket()` emits a focused downgrade readiness packet. |
| Enterprise customers | Locked enterprise features such as SAML and data rooms require migration planning. |

## Acceptance notes

- Dependency-free CommonJS module.
- Deterministic sample downgrade packet and tests.
- No credentials, payment API calls, or network calls.
- Generated report artifacts are local.
