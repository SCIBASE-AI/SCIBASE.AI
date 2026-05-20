# Requirements Map

| Issue #12 Requirement | Implementation |
| --- | --- |
| Markdown and LaTeX support | Equation checks require LaTeX source, fallback text, labels, and WYSIWYG previews |
| Cross-referencing of figures, tables, and citations | Referenced equations, figures, and tables are checked for labels/anchors; citations are checked for formatted previews |
| Syntax highlighting for code snippets | Code blocks are checked for declared language and reviewer captions |
| WYSIWYG editor toggle for non-technical users | Non-text scientific blocks need plain-language WYSIWYG previews |
| Embedded notebook output review | Notebook cells are checked for kernels, freshness, and accessible output summaries |
| Inline collaboration review readiness | Findings become reviewer tasks and release-hold decisions |
| Version/release evidence | Deterministic audit digest and JSON/Markdown/SVG/MP4 artifacts support release review |
