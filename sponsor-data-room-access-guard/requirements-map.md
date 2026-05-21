# Requirements Map

| Issue #18 capability | Covered by this slice |
| --- | --- |
| Secure private project space | Validates sponsor data-room grants before solver/reviewer access is opened. |
| Pre-qualification rounds | Blocks grants when `prequalificationStatus` is not `approved`. |
| NDA support | Blocks private grant access until `ndaAcceptedAt` is present. |
| Audit logs for reproducibility | Emits deterministic audit events for NDA holds, stale access, least-privilege violations, and revocation needs. |
| Standardized evaluation dashboard | Generates reviewer-safe JSON, Markdown, SVG, and demo artifacts. |
| IP management and protected submissions | Keeps dataset/protocol access least-privilege and time-bounded before payout or arbitration. |

This is not a duplicate intake, scoring, arbitration, payout, appeal, anti-collusion, IP-redaction, evidence-freeze, clarification-freeze, or award-transparency module. It focuses on the sponsor data-room access window where private scientific inputs are released to qualified solvers and reviewers.
