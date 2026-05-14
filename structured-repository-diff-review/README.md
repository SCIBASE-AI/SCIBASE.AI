# Structured Repository Diff Review

Self-contained Project Repository & Version Control module for SCIBASE issue #10. It focuses on reviewer-facing structured change review for scientific repositories: component manifests, CSV/JSON/notebook-aware diffs, semantic impact scoring, reproducibility checks, rollback planning, provenance, citation metadata, and export bundles.

## Scope

- Typed component manifest for `manuscript/`, `data/`, `code/`, `notebooks/`, `results/`, `protocols/`, and `metadata.json`.
- Hash-based before/after integrity records for every component.
- CSV diffing for schema changes, added/removed rows, and changed cells.
- JSON metadata diffing with citation-sensitive change detection.
- Notebook cell diffing for added, removed, modified, and reordered cells.
- Git LFS-style large object detection for binary results.
- Semantic impact scoring that decides when schema, notebook, and citation review is required.
- Reproducibility plan generation for sandboxed pipeline reruns.
- Rollback plan generation with restore hashes and citation badge rebuild actions.
- Fork, merge request, reviewer, and contributor provenance summary.
- Version DOI, APA, and BibTeX metadata for "cite this project" workflows.
- Local API endpoints and tests for reviewer validation.

No database, Git server, container runtime, DOI provider, or external API is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4365 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4365/api/health
curl -fsS http://localhost:4365/api/manifest
curl -fsS http://localhost:4365/api/diff
curl -fsS http://localhost:4365/api/review
curl -fsS http://localhost:4365/api/rollback
curl -fsS http://localhost:4365/api/export
```

## Demo Flow

1. Open `/api/manifest` to inspect required repository components and hashes.
2. Open `/api/diff` to review CSV schema changes, JSON metadata changes, notebook cell changes, text changes, and binary hash changes.
3. Open `/api/review` to see semantic impact scoring, reproducibility warnings, citation metadata, provenance, and the audit hash.
4. Open `/api/rollback` to inspect restore hashes for reverting the target version.
5. Open `/api/export` to review the bundle a REST API or CLI could produce for labs and institutional reviewers.

See `docs/requirement-map.md` for issue requirement coverage.
