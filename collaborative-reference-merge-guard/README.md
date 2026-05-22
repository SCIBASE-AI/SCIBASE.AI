# Collaborative Reference Merge Guard

This module adds a self-contained reference library merge guard for issue #12, Real-time collaborative research editor & interface.

It validates concurrent Zotero, BibTeX, and EndNote-style library merges before a collaborative manuscript is exported. It detects DOI/PMID duplicate records, citation-key collisions, stale in-text citation anchors, locked-reference edits, incomplete source metadata, and unresolved merge conflicts.

The module is dependency-free, uses only synthetic sample data, and performs no calls to Zotero, EndNote, Crossref, PubMed, browser sessions, credentials, or external services.

## Files

- `index.js`: merge evaluation logic and reviewer packet formatter.
- `sample-data.js`: three synthetic collaborative editor scenarios.
- `test.js`: Node test coverage for hold, review, and export-ready decisions.
- `demo.js`: writes JSON, Markdown, SVG, and MP4 reviewer artifacts under `reports/`.
- `requirements-map.md`: maps the implementation to issue #12 requirements.

## Run

```bash
node --test collaborative-reference-merge-guard/test.js
node collaborative-reference-merge-guard/demo.js
```

To generate `reports/demo.mp4`, set `FFMPEG_PATH` to a local ffmpeg binary before running `demo.js`.

## Outputs

- `reports/reference-merge-packet.json`
- `reports/reference-merge-review.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Decision Model

- `hold-export`: blocking duplicate identifiers, citation-key collisions, stale anchors, or locked-reference edits are present.
- `merge-review`: no blockers, but incomplete metadata or unresolved import conflicts need human review.
- `export-ready`: merged references and manuscript citations are safe to sync and export.
