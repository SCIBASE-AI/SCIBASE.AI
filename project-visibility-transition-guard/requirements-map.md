# Requirements Map

Issue: `SCIBASE-AI/SCIBASE.AI#11`

| Issue requirement | Implementation |
| --- | --- |
| User and project management | Models a scientific workspace, collaborators, objects, external access, holds, and audit evidence for a visibility transition. |
| Visibility settings | Evaluates `institutional-only -> public` transitions before the workspace is exposed. |
| Role-based governance | Requires owner, data-steward, and institution-admin approvals before public release. |
| Fine-grained object-level control | Blocks unsafe public object permissions, restricted datasets, anonymous-review comments, and non-allowlisted object kinds. |
| Audit log | Requires unique, attributable, chronological request/review/approval/release evidence; event count alone cannot satisfy the guard. |
| Safe local validation | Includes dependency-free tests and demo generation from synthetic project metadata only. |

## Non-goals

- No live OAuth, SAML, ORCID, profile, storage, permission, or audit-log calls.
- No private project data, credentials, real users, or access-control mutations.
- No replacement for token, deletion, break-glass, profile-sync, funding, or contribution-credit workflows.
