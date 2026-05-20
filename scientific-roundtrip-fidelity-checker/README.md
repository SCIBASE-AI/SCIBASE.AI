# Scientific Round-Trip Fidelity Checker

This module is a focused slice for SCIBASE.AI issue #12, Real-Time Collaborative Editor.

It verifies that scientific documents can move through Markdown, LaTeX, and notebook export/import paths without silently losing publication-critical context. The sample data is synthetic and dependency-free.

## What It Covers

- Equation LaTeX, labels, and citation keys.
- Figure and table anchors, captions, source assets, and table columns.
- Jupyter-style cell IDs, languages, source hashes, output hashes, and execution counts.
- Inline comments and unresolved suggestions that must survive review export.
- Cross-reference integrity across figures, tables, equations, and notebook cells.
- Reviewer repair queues, JSON audit packets, Markdown review packets, SVG summaries, and a short MP4 demo artifact.

## Run

```bash
node scientific-roundtrip-fidelity-checker/test.js
node scientific-roundtrip-fidelity-checker/demo.js
```

Demo output is written to:

- `reports/roundtrip-audit.json`
- `reports/review-packet.md`
- `reports/roundtrip-fidelity.svg`
- `reports/demo.mp4`
