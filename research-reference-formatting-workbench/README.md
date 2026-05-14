# Research Reference Formatting Workbench

This self-contained module implements a focused reference-manager and publication-formatting layer for SCIBASE issue #12. It is designed to sit inside a real-time scientific editor where manuscript text, LaTeX, citations, figures, tables, equations, and notebook/runtime references need to remain publication-ready while collaborators edit.

The module is deterministic, dependency-free, and credential-free.

## What It Covers

- BibTeX-style import for article and software references.
- Manual reference records for datasets and platform artifacts.
- Markdown citation extraction such as `[@ortiz2025; @park2024]`.
- LaTeX citation extraction such as `\cite{scibase2026}`.
- First-use citation ordering for Nature/Vancouver-style numeric labels.
- APA, Nature, and Vancouver bibliography rendering.
- Figure, table, and equation cross-reference validation through markers such as `{{fig:pipeline}}`.
- Readiness checks for missing citations, duplicate keys, unresolved cross-references, uncited records, and missing DOI metadata.
- Stable export digests so an autosaved or named manuscript version can prove exactly which bibliography/cross-reference state was exported.

## Local Verification

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
Ready for export: true
Resolved cross-references: 3
Cited references: 4
```

## Files

- `src/reference-workbench.js` - citation, bibliography, cross-reference, and export-readiness engine.
- `data/sample-manuscript.json` - sample scientific manuscript with BibTeX, dataset references, LaTeX, citations, and cross-references.
- `test/reference-workbench.test.js` - Node test coverage for parser, formatter, citation order, blockers, and export digest behavior.
- `scripts/demo.js` - CLI demo for reviewers.
- `docs/requirement-map.md` - issue #12 requirement mapping.
- `docs/demo.svg` and `docs/demo.mp4` - short demo artifacts for PR review.
