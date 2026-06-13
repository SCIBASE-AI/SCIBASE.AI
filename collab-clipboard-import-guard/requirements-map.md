# Requirements Map

| Issue #12 requirement | Coverage in this slice |
| --- | --- |
| Real-time collaborative editor shared state | Gates pasted/imported blocks before they become collaborative manuscript state. |
| Markdown, scientific blocks, and WYSIWYG workflows | Models paragraph, table, notebook-output, and comment blocks from clipboard and file-import paths. |
| Real-time collaboration trust boundary | Stages imports with malformed top-level batch payloads, malformed block-list payloads, malformed block entries, malformed table cells or rows, malformed existing-anchor metadata, missing source trust metadata, unsupported import channels, or missing/blank/malformed trusted and partner attestations for curator review before collaborative insertion, and quarantines source-origin metadata that exposes local/private paths without echoing those paths in finding messages. |
| Inline comments, suggestions, and review metadata | Detects stale or malformed review metadata before imported comments are trusted. |
| Version history and controlled sections | Compares imported review metadata against current section versions and drops unverifiable expiry evidence. |
| Scientific rigor and formatting fidelity | Escapes spreadsheet formulas, regenerates every colliding duplicate or existing-document anchor with unique fallbacks when source block IDs are missing, and redacts private source-origin, notebook, table-cell, lowercase-drive Windows user paths, and forward-slash Windows user paths while preserving clean content. |
| Reviewer-ready artifacts | Produces deterministic JSON packets, Markdown summary, SVG overview, and MP4 demo evidence. |

## Non-overlap Notes

The contribution is scoped to import provenance and pre-insertion sanitation. It does not implement another broad editor module, operation replay engine, offline conflict resolver, notebook kernel lease guard, reference manager, authorship workflow, freeze lane, autosave/local-cache privacy guard, export round-trip checker, presence guard, accessibility guard, evidence-binding guard, embargo release guard, notification guard, data availability guard, LaTeX macro guard, or accepted-suggestion provenance guard.
