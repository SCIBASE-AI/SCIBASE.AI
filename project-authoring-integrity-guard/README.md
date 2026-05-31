# Project Authoring Integrity Guard

Self-contained guard for SCIBASE issue #11, User & Project Management.

The module validates research workspace authoring bundles before a project is published, archived, or handed off. It focuses on the project-space authoring layer: Markdown/LaTeX manuscripts, Jupyter notebooks, datasets, code, discussion decisions, citations, contributor attribution, and reproducibility manifests.

## What It Checks

- Manuscripts, notebooks, code, and datasets carry stable checksums.
- Notebook outputs are fresh against the referenced code and dataset checksums.
- Citation and DOI metadata list the actual collaborators with ORCID-ready attribution consent.
- Restricted datasets are not silently referenced by public manuscripts.
- Major authoring decisions have discussion signoff evidence.
- Funding, institution, license, and reproducibility manifest fields are present before publication.

## Files

- `index.js` - evaluation engine and report formatters
- `sample-data.js` - synthetic workspace scenarios
- `test.js` - dependency-free tests using Node's built-in `assert`
- `demo.js` - generates reviewer JSON, Markdown, and SVG reports
- `render-video.js` - renders a short MP4 with `ffmpeg`, or an animated GIF fallback with ImageMagick
- `reports/demo.mp4` - reviewer demo artifact

## Validation

```bash
node project-authoring-integrity-guard/test.js
node project-authoring-integrity-guard/demo.js
node project-authoring-integrity-guard/render-video.js
node --check project-authoring-integrity-guard/index.js
node --check project-authoring-integrity-guard/sample-data.js
node --check project-authoring-integrity-guard/test.js
node --check project-authoring-integrity-guard/demo.js
node --check project-authoring-integrity-guard/render-video.js
```
