# Requirements Map

| Issue #11 requirement | Coverage in this module |
| --- | --- |
| Create, manage, and archive research projects | `evaluateProjectArchiveHandoff` validates archive readiness and produces read-only archive actions. |
| Linked collaborators, funding sources, and institutions | Member relationships distinguish institutional/internal members from external reviewers. |
| Role-based access control | Only active owners/admins can request archive, and only active internal owners/admins can receive handoff. |
| Custom sharing with time-limited/read-only access | External write/download grants are revoked or block archive when auto-revocation is disabled. |
| Fine-grained object-level control | Required manuscript, dataset, and code artifacts must have checksum and owner attribution before freeze. |
| Project-level audit log | The result emits a deterministic `project.archive_handoff.evaluated` audit event. |
| Project metadata and citations | The citation snapshot captures artifact versions, checksums, DOIs, and a stable fingerprint. |

## Non-Overlap Note

This submission is separate from existing workspace access ledger, identity recovery, project member lifecycle, institutional recertification, anonymous review escrow, data-room consent, and researcher profile reputation modules. It focuses specifically on safe project archive and ownership handoff.
