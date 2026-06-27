# Collaborative Cover-Letter Export Guard

Self-contained reviewer artifact for SCIBASE issue #12, focused on the last step before a collaborative manuscript export includes its journal cover letter.

The guard evaluates synthetic submission packets for:

- stale manuscript and cover-letter hashes after final collaborative edits
- missing or stale corresponding-author approval
- coauthor approval drift after the final manuscript version
- novelty, ethics, data availability, and conflict statement mismatches
- private reviewer or collaborator notes leaking into the submission-facing cover letter

It emits deterministic `RELEASE`, `REVIEW`, or `HOLD` decisions with JSON, Markdown, SVG, and MP4 artifacts. It uses no credentials, no private manuscripts, no external APIs, and no live editor service.

## Requirement Mapping

| Issue #12 capability | Covered here |
| --- | --- |
| Inline comments, suggestions, and change tracking | Blocks cover-letter export when private or unresolved collaborator notes are included |
| Version history and autosave | Requires cover-letter and approvals to match the final manuscript hash |
| Integrated task workflow | Produces remediation actions for missing approvals and claim drift |
| Scientific formatting and publication workflow | Validates the journal-facing correspondence packet before export |

## Local Validation

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

Generated artifacts are written to `reports/`.
