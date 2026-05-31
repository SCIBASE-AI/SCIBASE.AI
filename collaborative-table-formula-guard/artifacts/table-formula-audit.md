# Collaborative Table Formula Audit

Document: problem-manuscript
Decision: hold-export
Issue counts: high 6, medium 1, low 0

| Severity | Code | Section | Table | Cell | Message |
| --- | --- | --- | --- | --- | --- |
| high | BROKEN_TABLE_FORMULA_REFERENCE | locked-results | collaborative-derived-values | D3 | Formula in D3 references missing cells: C4. |
| high | LOCKED_SECTION_FORMULA_MUTATION | locked-results | collaborative-derived-values | D2 | Formula-affecting edit formula-change occurred after section lock. |
| high | NOTEBOOK_OUTPUT_DRIFT | locked-results | collaborative-derived-values |  | Table Collaborative derived endpoint rates is sourced from notebook cell nb-cell-9 whose output hash changed after review. |
| high | PRIVATE_NOTE_TABLE_EXPORT_LEAK | locked-results | collaborative-derived-values | A4 | Exported table cell A4 contains private or reviewer-only context. |
| high | STALE_TABLE_DERIVED_VALUE | locked-results | collaborative-derived-values | D2 | Formula cell D2 is stale: expected 0.25, exported 0.29. |
| high | UNREVIEWED_NOTEBOOK_OUTPUT | locked-results | collaborative-derived-values |  | Table Collaborative derived endpoint rates uses notebook output generated after the latest table review. |
| medium | HIDDEN_CELL_EXPORT_LEAK | locked-results | collaborative-derived-values | E2 | Hidden table cell E2 is still marked for export. |

## Remediation

- Repair formula references or bind them to explicit table rows before accepting the collaborative change.
- Route formula-affecting edits in locked sections through reviewer approval or unlock the section intentionally.
- Refresh notebook-derived table outputs and require a new review hash before release.
- Strip private notes and hidden helper cells from the manuscript table export.
- Recompute stale derived table cells from the latest referenced inputs before export.
