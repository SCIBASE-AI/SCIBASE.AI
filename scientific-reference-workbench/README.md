# Scientific Reference Workbench

Dependency-free citation and cross-reference checks for a real-time scientific editor.

This module focuses on the publication-formatting layer of issue #12. It turns manuscript sections, Markdown text, equation blocks, figures, tables, and bibliography entries into a deterministic export-readiness packet.

## Run

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Manuscript: Protocol-Guided Perturbation Screening
Status: format-review-needed
Citations discovered: 3
Missing citations: missing2026
Cross references: 3
Formatting tasks: 1
Top action: Add bibliography entry for @missing2026 or remove the citation.
```

## Files

- `src/reference-workbench.js` extracts citations and cross references, builds numbering, formats blocks, validates style requirements, emits reviewer tasks, and signs the packet with a stable digest.
- `data/sample-manuscript.json` contains synthetic manuscript sections, bibliography entries, equation/figure/table labels, and references.
- `test/reference-workbench.test.js` verifies citation coverage, label numbering, formatted text, export blocking, and resolved-export behavior.
- `docs/requirement-map.md` maps the slice to issue #12.
- `docs/demo.svg` and `docs/demo.mp4` provide a short visual artifact for review.

No external reference-manager credential, private manuscript, or third-party API is used.
