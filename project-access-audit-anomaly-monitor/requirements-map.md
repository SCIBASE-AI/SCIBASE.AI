# Requirements Map

## Issue #11: User & Project Management

| Requirement | Coverage |
| --- | --- |
| Authentication and identity posture | `postureRisk` checks MFA, SAML linkage, ORCID linkage, and inactive-user access. |
| Project spaces and audit logs | Synthetic project audit events model data exports, downloads, role changes, visibility changes, API token creation, and object-level permission drift. |
| Permissions and access control | `restrictedObjectRisk`, `roleChangeRisk`, and `driftRisk` validate object-level access, role elevation, and permission drift. |
| External collaborator controls | `staleExternalRisk` flags expired or missing external collaborator access windows. |
| Fine-grained object-level control | Objects include sensitivity, license, download role requirements, bulk thresholds, and expected roles. |
| Project-level audit review | `buildProjectPacket` emits project-level severity counts, owner queues, export holds, and reviewer summaries. |
| Governance evidence | `buildReviewerMarkdown` and `audit-report.json` provide deterministic review packets for admins and project owners. |
| Tests and demo | `test.js` verifies critical restricted-download detection, drift handling, role-change evidence, project export holds, low-risk retention, and reviewer packet generation. `demo.js` emits JSON, Markdown, and SVG artifacts. |

## Acceptance Notes

- Synthetic data only; no external service calls or private data.
- No dependencies beyond the Node.js standard library.
- This is an audit-log anomaly monitor, not another broad RBAC implementation.
- Critical access events produce explicit freeze/review actions instead of silently adding a score.
