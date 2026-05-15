# Requirement Map

This module contributes a focused rich-formatting slice for issue #12, "Real-time collaborative research editor & interface."

| Issue area | Covered by this module |
| --- | --- |
| Markdown and LaTeX support | Tracks equation blocks and deterministic equation numbering |
| Cross-referencing figures, tables, and citations | Extracts citation keys and `{{label}}` references, validates coverage, and renders deterministic display labels |
| Reference manager integration | Verifies bibliography coverage for citation keys and surfaces unused bibliography entries |
| Publication-style templates | Checks required publication sections and blocks export when style requirements fail |
| Inline reviewer workflow | Emits owner-assigned formatting tasks for missing citations, missing cross-references, duplicate labels, and missing sections |

## Distinctness

Existing #12 submissions focus on broad collaborative editors, operation replay, governance, offline conflict resolution, and notebook collaboration. This module focuses on the publication-formatting layer that a scientific editor needs before export:

- citation-key extraction from manuscript text
- bibliography coverage checks
- figure/table/equation label numbering
- unresolved cross-reference detection
- style-specific required-section checks
- reviewer-ready formatting task output

## Verification

```bash
cd scientific-reference-workbench
npm run check
npm test
npm run demo
```
