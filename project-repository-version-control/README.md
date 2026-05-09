# Project Repository & Version Control

This module is a self-contained implementation for SCIBASE.AI issue #10. It models the scientific project repository as a citable, versioned, reproducible workspace with manuscript, data, code, notebook, result, protocol, and metadata components.

## What It Covers

- Repository structure for `manuscript/`, `data/`, `code/`, `notebooks/`, `results/`, `protocols/`, and `metadata.json`.
- Hash-based manifest generation for file integrity and reproducible export bundles.
- Commit history, branch timelines, semantic version DOI metadata, forks, attribution, and merge request summaries.
- Markdown/notebook-aware diff summaries for review workflows.
- Computation-aware reproducibility checks for pipeline presence, raw data hashes, expected outputs, metadata schema, and sandbox execution.
- Auto-generated APA, MLA, and BibTeX citations.
- JSON API and browser dashboard for reviewer smoke testing.

## Run Locally

```bash
cd project-repository-version-control
npm test
npm start
```

Then open `http://localhost:4129`.

## API Surface

- `GET /api/dashboard`
- `GET /api/repositories/repo-organoid-response`
- `GET /api/repositories/repo-organoid-response/manifest`
- `GET /api/repositories/repo-organoid-response/merge-request`
- `GET /api/repositories/repo-organoid-response/reproducibility`
- `GET /api/repositories/repo-organoid-response/citation?style=APA|MLA|BibTeX`
- `GET /api/repositories/repo-organoid-response/export`

## Requirement Mapping

- Repository components: represented in `demoRepository.files`.
- File and metadata versioning: implemented by `buildManifest`, hash generation, branches, and commits.
- Collaboration and forking: represented by `forks`, `mergeRequests`, branch timelines, discussion, and reviewer metadata.
- In-browser editors and diffs: implemented as Markdown/notebook-aware diff summaries and dashboard review surfaces.
- Computation-aware reproducibility: implemented by `runReproducibilityCheck`.
- Repository identifiers and citation: implemented by DOI generation and `buildCitation`.
- Programmatic access and export: implemented by the JSON API and `buildExportBundle`.

## Verification

```bash
npm test
node src/server.js
```

Optional smoke checks:

```bash
curl -s http://localhost:4129/api/dashboard
curl -s http://localhost:4129/api/repositories/repo-organoid-response/manifest
curl -s "http://localhost:4129/api/repositories/repo-organoid-response/citation?style=BibTeX"
```

Demo artifacts are committed under `docs/demo/`, including `dashboard.png` and `project-repository-version-control-demo.mp4`.
