# Issue #12 Requirement Map

| Issue #12 requirement | Implementation evidence |
| --- | --- |
| Markdown and LaTeX support | `buildPublicationPackage()` detects LaTeX blocks while preserving manuscript section bodies for editor rendering. |
| Cross-referencing of figures, tables, and equations | `buildCrossReferenceReport()` indexes `fig:`, `tbl:`, and `eq:` targets and resolves inline markers such as `{{fig:pipeline}}`. |
| Reference manager integration | `parseBibtex()`, `loadReferences()`, and `buildReferenceIndex()` import BibTeX-style records plus manual references. |
| Citation formatting | `formatReference()` and `buildBibliography()` render Nature, APA, and Vancouver-style bibliography entries. |
| Auto-formatting templates | `buildPublicationPackage()` emits an export plan with publication template, style, citation order, bibliography, and a stable digest. |
| Scientific editor quality checks | `buildCitationReport()` catches missing citation keys, duplicate keys, and uncited references before publication export. |
| Notebook/code manuscript context | The sample manuscript includes runtime citations, inline LaTeX, and code-block detection support for mixed research documents. |
| Version-ready export evidence | The export digest hashes title, style, citation order, bibliography, and resolved cross-references for review/audit snapshots. |
| Reviewer validation | `npm run check`, `npm test`, `npm run demo`, `docs/demo.svg`, and `docs/demo.mp4` provide local and visual verification. |

This slice is deliberately focused on the reference/cross-reference formatting layer so it complements existing collaboration, offline-editing, and notebook workbench submissions.
