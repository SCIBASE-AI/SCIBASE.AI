# Requirement Map

| Issue #11 requirement | Implementation |
| --- | --- |
| Email/password, OAuth, ORCID, SAML, anonymous mode | `src/sample-data.js` models linked identities and anonymous reviewer profile state. |
| Researcher profiles and public/private modes | `buildProfilePrivacyReport` evaluates visibility, affiliation, ORCID, reputation, and anonymous-review exposure. |
| Project spaces and visibility | Sample projects include public/private/institutional/invitation-only modes and workspace objects. |
| Role-based access | `evaluateAccess` enforces Owner, Admin, Contributor, Reviewer, and Viewer capabilities. |
| Fine-grained object-level control | Object policies distinguish edit, comment, review, download, audit, and manage actions. |
| External collaborators with time-limited/read-only access | `evaluateInvitationRisk` checks expiry, role, institution, external domain, object scopes, and MFA requirements. |
| Project-level audit log | `buildAuditEvidence` creates immutable event hashes and an audit summary. |
| Access review history | `buildAccessReviewCampaign` generates reviewer-ready campaign findings and revocation recommendations. |
| Reviewer-ready local validation | `npm run check`, `npm test`, and local API smoke commands validate behavior without credentials. |
