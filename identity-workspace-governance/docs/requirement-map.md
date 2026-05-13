# Requirement Map

| Issue #11 requirement | Implementation evidence |
| --- | --- |
| Email/password, 2FA, OAuth, SAML, account linking | `buildIdentityRecord` models provider links, MFA, SAML, and assurance level. |
| Anonymous user mode | `buildIdentityRecord` supports anonymous identities with reduced assurance. |
| Researcher profiles and ORCID sync | `buildResearcherProfile` includes ORCID, affiliations, grants, keywords, activity, and visibility. |
| Citation and reputation metrics | `calculateReputationScore` combines citations, downloads, forks, endorsements, reviews, and reproducibility. |
| Project spaces | `buildProjectSpace` models documents, code, datasets, discussions, metadata, citations, collaborators, funding, and institutions. |
| Visibility settings | Project `visibility` supports public, private, institutional-only, and invitation-only. |
| Role-based access | `evaluateAccess` uses role permissions for owner/admin/contributor/reviewer/viewer. |
| Custom sharing and time-limited invites | `createInvitation` and `isInvitationActive` model expiring external access. |
| Object-level control | `evaluateAccess` applies object policies such as data-download restrictions. |
| Project audit log | `appendAuditEvent` records access and change events with actor, action, target, and timestamp. |
