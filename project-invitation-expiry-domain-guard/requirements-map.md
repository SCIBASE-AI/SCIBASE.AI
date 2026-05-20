# Requirements Map

| Issue #11 requirement | Implementation |
| --- | --- |
| Secure access control | `evaluateInvitation()` holds risky guest invitations before access is granted. |
| Teams and external partners | Domain allowlists validate institution and partner invites. |
| Role-based permissions | Sensitive and unknown roles are blocked from automatic guest invitation. |
| Project-level access management | `createInvitationReviewPacket()` emits ready and held invitation queues per project. |
| Auditability | `policyReceipt` records allowed domains, guest roles, and sensitive roles. |
| Account and workspace governance | Inactive, missing, or unauthorized inviters trigger owner remediation. |

## Acceptance notes

- Dependency-free CommonJS module.
- Deterministic sample data and tests.
- No credentials, database calls, or network calls.
- Generated report artifacts are local.
