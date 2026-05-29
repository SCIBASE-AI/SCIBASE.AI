# Editor Suggestion Provenance Guard

This module adds a focused provenance guard for real-time collaborative research editing. It checks whether suggestions and tracked changes preserve enough authorship, source-section, review-mode, and acceptance lineage for audit-safe collaboration.

It is intentionally separate from full editor UI, section locking, autosave and version history, notebook execution, chat, task workflows, citation tooling, and broad presence indicators. This guard only handles suggestion provenance and acceptance auditability.

## What It Checks

- Suggestion author visibility in anonymous review mode
- Source document and section references
- Stale target ranges after document edits
- Reviewer/author permissions
- Accepted-change provenance lineage
- Deterministic accept/display or hold actions

## Demo

Run:

```bash
node editor-suggestion-provenance-guard/test.js
node editor-suggestion-provenance-guard/demo.js
node editor-suggestion-provenance-guard/render-video.js
```

Generated artifacts:

- `reports/suggestion-provenance-report.json`
- `reports/suggestion-provenance-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call live editors, identity providers, storage services, private manuscripts, credentials, or SCIBASE production services.
