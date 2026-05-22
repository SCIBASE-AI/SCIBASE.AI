# Requirements Map

Issue #12 asks for a real-time collaborative editor that supports scientific formatting, reference manager integration, version history, comments, and export-ready publication workflows. This slice covers the reference manager merge-safety path.

## Reference Manager Integration

- Supports synthetic Zotero, BibTeX, and EndNote-style reference records.
- Normalizes DOI, DOI URL, and PMID identifiers before comparing imported references.
- Detects duplicate source records that would create ambiguous collaborative library state.

## Rich Scientific Formatting

- Checks citation keys used by manuscript sections before export.
- Detects citation-key collisions that would make Markdown, LaTeX, or publication-format output point to the wrong source.
- Detects stale in-text citation anchors after a concurrent library merge.

## Collaborative Editing Safety

- Blocks edits to locked reference records until the reference owner approves them.
- Routes unresolved collaborator import conflicts to merge review rather than final export.
- Produces deterministic visible and gated actions for sync, export, and collaborator notification.

## Version History And Auditability

- Records `manuscriptId`, `libraryRevision`, generation timestamp, reference count, citation count, findings, and remediation actions.
- Emits JSON and Markdown reviewer packets for pull request review.
- Emits an SVG summary and MP4 demo artifact for Algora reviewer evidence.

## Safety Boundaries

- Synthetic fixtures only.
- No private manuscripts, credentials, browser cookies, payment data, Zotero/EndNote accounts, DOI registry calls, PubMed calls, Crossref calls, or external network access.
- Dependency-free Node implementation.
