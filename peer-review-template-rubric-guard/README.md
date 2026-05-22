# Peer Review Template Rubric Guard

Self-contained reviewer module for issue #15, Community & User Reputation System.

The guard validates discipline-specific structured peer-review templates before their reviews can affect project timelines, reviewer profiles, citation pages, or reputation deltas.

## What It Does

- Holds templates that miss required rubric dimensions: clarity, rigor, novelty, and reproducibility.
- Blocks score scales outside a comparable 0..10 range.
- Requires rubric evidence anchors for reviewed documents, datasets, code, and notebooks.
- Routes anonymous or double-blind privacy gaps to curator review.
- Requires reviewer declarations for conflicts, method expertise, and data access.
- Checks profile/citation publication packets for rubric versioning and anonymous identity redaction.
- Generates deterministic JSON, Markdown, SVG, and MP4 artifacts from synthetic fixtures only.

## Files

- `index.js` - dependency-free rubric evaluator and Markdown packet builder.
- `sample-data.js` - synthetic templates for held, curator-review, and publish decisions.
- `test.js` - Node tests for blocking, review-only, and publication-ready templates.
- `demo.js` - report generator and optional MP4 artifact writer.
- `requirements-map.md` - issue requirement mapping.
- `reports/` - generated reviewer artifacts.

## Run

```bash
node --test peer-review-template-rubric-guard/test.js
FFMPEG_PATH=/path/to/ffmpeg node peer-review-template-rubric-guard/demo.js
```

No live reviewers, profiles, projects, identities, credentials, external services, or network calls are used.
