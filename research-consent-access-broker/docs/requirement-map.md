# Requirement Map

| Issue #11 area | Covered by this module |
| --- | --- |
| Authentication & identity | Researcher identities include email, ORCID, SAML domain, MFA posture, groups, and anonymous reviewer mode. |
| Researcher profiles | Access decisions use institution, identity mode, group membership, and verified profile metadata. |
| Project spaces | Projects, memberships, protected objects, object grants, and invitations are evaluated together. |
| Visibility settings | Invitation-only project access is enforced through project membership and object-level grants. |
| Role-based access | Membership roles appear in every access decision and are combined with object grants. |
| Object-level control | Sensitive datasets and review packages are evaluated separately with grant, consent, DUA, and reviewer-only rules. |
| External collaborators | DUA and invitation checks block collaborators whose institution lacks an active agreement. |
| Anonymous mode | Anonymous reviewers can review blinded packages without accessing private datasets. |
| Audit log | Each decision, invitation action, and grant-drift finding receives a deterministic SHA-256 digest. |
| Compliance governance | Consent revocation, IRB expiry, DUA expiry, MFA gaps, and SAML domain mismatch produce explicit hold reasons. |

## Distinct slice

Existing issue #11 submissions cover broad RBAC, workspace lifecycle, access recertification, and project member offboarding. This module is narrower: it gates sensitive research objects using consent records, data-use agreements, IRB status, reviewer anonymity, and grant drift.
