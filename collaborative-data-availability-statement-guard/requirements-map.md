# Requirements Map

Issue: `SCIBASE-AI/SCIBASE.AI#12`

| Issue requirement | Implementation |
| --- | --- |
| Real-time collaborative research editor | Models collaborative manuscript sections, comments, pending changes, and role-based author approvals before export. |
| Manuscript export readiness | Blocks final export when availability statements, repository citations, reviewer access, or collaborator approvals are incomplete. |
| Research artifact handling | Validates dataset and code repository accessions, artifact licenses, checksums, and human-derived data safeguards. |
| Reviewer-safe workflow | Produces deterministic JSON, Markdown, SVG, and video artifacts for local reviewer inspection without external services. |
| Non-overlap with existing slices | Focuses on availability statement export gating rather than reference merges, notifications, accessibility, presence, evidence binding, or general embargo automation. |
| Safe local validation | Includes dependency-free tests and demo generation from synthetic manuscript and repository metadata only. |

## Non-goals

- No live GitHub, Zenodo, OSF, journal, identity, storage, or email calls.
- No private manuscripts, credentials, human-subject records, or reviewer data.
- No mutation of collaborative editor documents or repository permissions.
