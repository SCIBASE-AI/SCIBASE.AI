# Collaborative Supplementary Materials Guard

This module is a focused slice for SCIBASE.AI issue #12, Real-time collaborative research editor & interface.

It validates whether supplementary materials can safely ship with a collaborative manuscript export. The guard is intentionally separate from broad editor foundations, notebook execution queues, data-availability statements, statistics wording checks, alt-text accessibility, terminology governance, and table formula integrity.

## What It Checks

- Every exported supplement is cited from the manuscript.
- Exported supplement hashes match the current source artifact hashes.
- Notebook-derived supplements have fresh execution evidence.
- Restricted-data supplements have approved redaction review.
- Private reviewer or collaborator notes are not included in public exports.
- Blocking supplement comments are resolved or waived.
- Publication licenses are approved.
- Corresponding author and data steward approvals are present.
- Supplement sections are locked or snapshotted before export.

## Decisions

- `hold`: one or more blocker findings must be fixed before export.
- `revise`: no blockers, but warning-level publication readiness gaps remain.
- `export-ready`: the supplement packet is cited, fresh, approved, redacted, and locked.

## Run

```bash
npm test
npm run demo
```

## Reviewer Artifacts

- `reports/supplementary-materials-manifest.json`
- `reports/supplementary-materials-report.md`
- `reports/summary.svg`
- `reports/supplementary-materials-demo.mp4`
