# Requirement Map

| User & Project Management requirement | Implementation |
| --- | --- |
| User identity and linked researcher profiles | Members include institutional domains, SAML assertion expiry, ORCID verification timestamps, MFA posture, and email identity. |
| Project spaces and collaborators | `project` models allowed institution domains, review cadence, required training, and IRB protocols; `members` model internal and external collaborators. |
| Role-based access control | Elevated roles trigger SSO and MFA controls, and member roles are compared against object-level policies. |
| Object-level permissions | `objectPolicies` defines allowed roles per sensitive dataset/notebook, and `object-grant-exceeds-role` flags over-broad grants. |
| External collaborator management | External members require sponsors, current evidence, and stricter overdue review handling. |
| Invitations | Pending invitations older than the configured TTL are surfaced for cleanup. |
| Audit logs and review evidence | Every analysis returns member actions, findings, and a deterministic `sha256` audit digest. |

## Demo Video

The PR includes `docs/access-recertification-demo.mp4`, a real terminal walkthrough running the local check, test, and demo scripts.
