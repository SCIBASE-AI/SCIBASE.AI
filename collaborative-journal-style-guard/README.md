# Collaborative Journal Style Conformance Guard

Self-contained real-time editor slice for SCIBASE issue #12. It validates collaborative manuscript export readiness against target journal style rules before a shared document is exported.

## What It Checks

- Required section order for each target journal.
- Abstract and manuscript word-count limits.
- Figure and table limits.
- Required ethics, funding, conflict, author-contribution, and data-availability declarations.
- Reference style conformance.
- Blocking comments, unresolved tracked changes, suggestions, stale notebook outputs, and missing coauthor approvals.

## Why This Fits Issue #12

- Rich scientific formatting: checks sections, declarations, references, figures, and tables.
- Jupyter notebook integration: blocks stale notebook-derived outputs.
- Real-time collaboration: gates export on collaborative comments, tracked changes, suggestions, and approvals.
- Publication templates: applies journal-specific style limits and required declaration blocks.

## Run

```bash
node collaborative-journal-style-guard/test.js
node collaborative-journal-style-guard/demo.js
node collaborative-journal-style-guard/make-demo-video.js
```

Generated artifacts are written to `collaborative-journal-style-guard/reports/`.

## Safety

The module uses synthetic data only. It does not call external APIs, access credentials, process private manuscripts, or perform live publication exports.
