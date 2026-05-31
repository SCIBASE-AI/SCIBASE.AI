# Collaborative Footnote Export Guard

This module is a focused slice for the real-time collaborative research editor
described in issue #12. It checks whether footnotes and endnotes are safe to
include in a manuscript export after collaborative editing.

The guard is intentionally dependency-free and uses synthetic data only. It
does not call journal, payment, identity, storage, or external citation systems.

## What It Checks

- Orphaned manuscript footnote markers with no matching note text.
- Duplicate note markers that would collapse during Markdown, LaTeX, or EndNote
  export.
- Private reviewer or collaborator notes that should not leave the editor.
- Notes changed inside locked or final-review sections.
- Missing citation bindings for source-backed notes.
- Journal export order mismatches where endnotes must follow first appearance.

## Local Verification

```bash
node collaborative-footnote-export-guard/test.js
node collaborative-footnote-export-guard/demo.js
```

The demo writes reviewer-ready artifacts to
`collaborative-footnote-export-guard/reports/`.

## Issue #12 Mapping

This complements the collaborative editor requirements for scientific formatting,
cross-referencing, version history, section locks, comments/suggestions, and
publication export readiness without overlapping broader editor, reference merge,
figure/table, equation anchor, clipboard import, journal-style, or private
comment export slices.
