# Requirements Map

| Issue #11 requirement | Covered by this slice |
| --- | --- |
| Authentication & Identity | Requires verified requester MFA and active owner sponsorship before issuing service accounts or API tokens. |
| Researcher Profiles | Handles profile sync tokens as scoped profile metadata grants with audit evidence. |
| Project Spaces | Evaluates automation identities per project workspace and emits project-level owner review queues. |
| Permissions & Access Control | Checks scopes, protected actions, object-level artifact grants, restricted data access, expiration, rotation, and approval events. |
| Project-level audit log | Produces deterministic audit digests and owner-review packets for token issuance, retention, denial, or revocation decisions. |

## Non-overlap

Current nearby SCIBASE #11 work covers workspace ledgers, identity recovery, member lifecycle, institutional recertification, anonymous review escrow, data-room consent, profile sync, archive handoff, access-audit anomaly detection, role delegation, invitation domain checks, MFA enforcement, and funding attribution.

This contribution adds a machine-identity gate for service accounts and API tokens: a token cannot be issued or retained unless owner sponsorship, MFA, expiry, rotation, verified integration, object-level grants, and immutable approval events all pass.
