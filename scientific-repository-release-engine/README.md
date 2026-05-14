# Scientific Repository Release Engine

Self-contained MVP module for issue #10, **Project Repository & Version Control**. It focuses on the release layer of a scientific project repository: manifests, commits, dataset diffs, reproducibility gates, citations, and export bundles.

## What It Covers

- Required repository components: `manuscript/`, `data/`, `code/`, `notebooks/`, `results/`, `protocols/`, and `metadata.json`.
- File metadata, content hashes, and Git LFS-style large-file flags.
- Commit records with parent hash, changed files, branch, author, message, and provenance role.
- Structured dataset row diffs for added, removed, and changed records.
- Reproducibility gate for complete manifest, Docker/Conda environment, raw-to-results links, and sandbox policy.
- Semantic release tags, DOI-aware citation text, release hashes, and blocker lists.
- Export bundle manifest with file list, REST API routes, and Git-compatible CLI clone hint.

## Run

```bash
npm run check
```

That runs:

```bash
npm test
npm run demo
```

Expected demo shape:

```json
{
  "repositoryId": "project-atlas-001",
  "ready": true,
  "tag": "v1.0.0",
  "exportBundle": "project-atlas-001-1.0.0.zip"
}
```

## Requirement Map

| Issue #10 requirement | Implementation evidence |
| --- | --- |
| Structured repository components | `buildComponentManifest()` validates manuscript, data, code, notebooks, results, protocols, and metadata coverage. |
| File and metadata versioning | Manifest hashes, commit hashes, parent hash, changed file hashes, and semantic release tags. |
| Git LFS support for large files | Component files receive an `lfs` marker when size exceeds the repository threshold. |
| Semantic versioning and hash integrity | `createReleaseTag()` validates semantic tags and emits release hashes. |
| Collaboration provenance | `createCommitRecord()` records author, branch, message, changed files, and contributor role. |
| Rich data diffs | `diffDatasetRows()` reports added, removed, and changed rows by stable key. |
| Computation-aware reproducibility | `runReproducibilityGate()` checks environment definition, raw inputs, outputs, and sandbox policy. |
| Repository identifiers and citation | `createReleaseTag()` emits DOI-aware citation text. |
| Programmatic access and export | `buildExportBundle()` returns zip filename, file manifest, REST routes, and CLI clone command. |

## Files

- `src/index.js` - repository release rules and exported functions.
- `src/cli.js` - reviewer demo command.
- `sample/repository-fixture.json` - sample project, changeset, release, and dataset diff fixtures.
- `test/repository-release.test.js` - regression tests for manifests, commits, diffs, gates, releases, and exports.
- `docs/demo.svg` - visual walkthrough for PR review.

## Notes

This module is dependency-free and persistence-neutral. It is intended as a deterministic foundation for future Git, object storage, DOI provider, notebook execution, and REST API adapters.
