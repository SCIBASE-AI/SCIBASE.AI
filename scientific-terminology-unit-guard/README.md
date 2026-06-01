# Scientific Terminology And Unit Guard

Self-contained SCIBASE real-time collaborative editor slice for issue #12. The guard checks whether collaborator edits keep scientific terminology, acronyms, units, and equation variables consistent before WYSIWYG, Markdown, LaTeX, or publication exports proceed.

## Why this slice is distinct

Existing #12 submissions cover broad editor foundations, operation replay, offline conflict resolution, notebook/kernel collaboration, reference formatting, round-trip export, accessibility parity, suggestion provenance, chat mentions, notification visibility, task dependencies, section locks, and figure/table review lanes. This module focuses only on shared scientific language consistency while multiple collaborators edit the same manuscript.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Demo artifacts are written to `reports/`, including JSON, Markdown, SVG, GIF, and MP4 files.
