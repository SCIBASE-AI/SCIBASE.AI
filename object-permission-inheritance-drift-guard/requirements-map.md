# Requirements Map

Issue #11 asks for User & Project Management with project spaces, role-based access, object-level permissions, collaborators, and audit logs. This PR adds a focused inheritance drift guard for object permissions.

| Issue Capability | Guard Coverage |
| --- | --- |
| Project spaces and roles | Evaluates project role actions inherited by members. |
| Object-level permissions | Checks datasets, notebooks, manuscripts, and review threads against explicit overrides. |
| Collaborator access safety | Identifies inherited grants that expose sensitive objects to project members. |
| Governance approvals | Requires data-steward approval for sensitive pending actions. |
| Audit history | Emits deterministic remediation queues and SHA-256 audit digest. |
| Review artifact | Generates JSON, Markdown, SVG, and MP4 demo artifacts. |

## Non-Overlap Note

This is not another broad RBAC/workspace ledger, privacy review, member lifecycle/offboarding flow, institutional recertification module, anonymous escrow, data-room consent ledger, access-audit anomaly monitor, role delegation guard, automation-credential governance module, break-glass flow, visibility-transition guard, or project-provisioning baseline. It focuses narrowly on drift between inherited project grants and object-level overrides.
