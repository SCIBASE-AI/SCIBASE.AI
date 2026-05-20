# Requirements Map

| Issue #11 Theme | Implementation |
| --- | --- |
| User and project management | Models project-scoped service accounts, accountable human owners, sponsors, and project identifiers. |
| Role and object-level permission safety | Checks bot scopes against least-privilege automation grants and blocks privileged scopes. |
| External collaborator and integration governance | Flags unapproved external integrations and blocks data export without DUA evidence. |
| Audit logs and reviewer visibility | Emits stable audit digests, reviewer tasks, JSON reports, Markdown packets, and SVG/MP4 summaries. |
| Profile and identity assurance | Requires active human owners with MFA, SAML, and ORCID posture before renewal. |
| Credential-free local validation | Uses synthetic data only, dependency-free Node scripts, and deterministic tests. |
