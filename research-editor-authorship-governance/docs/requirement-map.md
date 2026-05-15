# Requirement Map

| Collaborative editor requirement | Implementation |
| --- | --- |
| Scientific document blocks | `manuscript.blocks` models sections, figures, and tables with owner and edit metadata. |
| Comments and suggestions | Blocking comments and required suggestions must be resolved before submission readiness. |
| Version history and approval | Author approvals are checked against the current manuscript hash, preventing stale approval reuse. |
| Task workflow | Findings produce actionable submission tasks such as collecting approvals, resolving suggestions, and reviewing contributors. |
| Collaboration governance | Non-author contributors who edited manuscript content are surfaced for authorship or acknowledgement review. |
| Publication readiness | CRediT role coverage, COI disclosures, and asset owner approvals are validated before journal export. |
| Auditability | Results include findings, actions, manuscript hash, and a deterministic `sha256` audit digest. |

## Demo Video

The PR includes `docs/authorship-governance-demo.mp4`, a real terminal walkthrough running the local check, test, and demo scripts.
