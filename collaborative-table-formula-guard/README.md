# Collaborative Table Formula Guard

This module adds a focused review lane for spreadsheet-like tables inside a real-time collaborative research editor. It blocks manuscript export when concurrent edits or notebook refreshes leave derived table values stale, formulas broken, or reviewer-only notes visible in exported tables.

## What It Checks

- Stale derived cells where an exported value no longer matches the formula result.
- Broken cell and range references after collaborative row or column edits.
- Formula-affecting edits made after a section has been locked for review.
- Notebook-derived table source drift after the last reviewed output hash.
- Hidden helper cells or private reviewer notes that would leak into an exported manuscript table.
- Circular formula dependencies that prevent deterministic recalculation.

## Usage

Run the tests:

```bash
node collaborative-table-formula-guard/test.js
```

Generate reviewer artifacts from the problem fixture:

```bash
node collaborative-table-formula-guard/demo.js
```

The demo writes:

- `artifacts/table-formula-audit.json`
- `artifacts/table-formula-audit.md`
- `artifacts/table-formula-audit.svg`

## Integration Shape

`auditCollaborativeTableFormulaGuard(document, options)` accepts a synthetic editor document with sections, tables, rows, formulas, lock metadata, notebook source hashes, and edit events. It returns:

- `decision`: `allow-export`, `needs-review`, or `hold-export`
- `summary`: severity counts
- `issues`: deterministic findings with section, table, cell, message, and evidence
- `remediation`: reviewer-ready action list

The implementation is dependency-free and uses a small safe arithmetic parser instead of dynamic evaluation.
