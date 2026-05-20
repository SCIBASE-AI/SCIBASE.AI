# Requirements Map

Source: SCIBASE.AI issue #12, Real-Time Collaborative Editor.

| Requirement | Implementation |
| --- | --- |
| Markdown and LaTeX support | The checker compares canonical scientific blocks against Markdown and LaTeX round-trip snapshots. |
| Inline equations | Equation LaTeX and anchor labels are validated for mutation and loss. |
| Cross-referencing figures, tables, and citations | Figure/table/equation labels, citation keys, and cross-reference edges are checked. |
| Reference manager integration | Citation keys are preserved as structured metadata across export/import paths. |
| Jupyter notebook integration | Notebook-cell language, source hash, output hash, and execution count are compared. |
| Output display preservation | Notebook output hashes are treated as high-severity fidelity evidence. |
| Inline comments and suggestions | Comment threads and unresolved suggestions are checked for loss in each format. |
| Version history and autosave compatibility | The audit includes document version metadata and deterministic digests for review history. |
| Publication export readiness | The summary returns block-export, repair-before-submit, review-warnings, or ready decisions. |
| Reviewer-facing artifacts | Demo emits JSON, Markdown, SVG, and MP4 artifacts under `reports/`. |
| Local verification | `test.js` covers format decisions, dropped blocks, equation mutation, citation loss, table column loss, notebook output drift, digest stability, Markdown output, and SVG output. |
