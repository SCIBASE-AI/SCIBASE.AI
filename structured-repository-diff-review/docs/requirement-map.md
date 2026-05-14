# Requirement Map

This module addresses SCIBASE issue #10 by implementing a focused structured diff and rollback review layer for scientific project repositories.

| Issue requirement | Implementation evidence |
| --- | --- |
| Repository structure and components | `buildComponentManifest()` validates typed entries for manuscript, data, code, notebooks, results, protocols, and metadata. |
| File and metadata versioning | Every component has deterministic before/after hashes, base and target versions, semantic version metadata, and a manifest hash. |
| Git-compatible integrity and Git LFS support | Large binary result artifacts are flagged as LFS candidates and tracked by content hashes. |
| Collaboration and forking | `buildProvenanceSummary()` records fork source, merge request metadata, reviewers, contributors, and touched paths. |
| Merge requests and review | `buildReviewPacket()` creates a reviewer-ready decision, audit hash, structured diffs, impact score, and required review actions. |
| In-browser editors and diffs | Editor hints are generated for Markdown, code, CSV grid diff, JSON tree diff, notebook cell diff, and binary hash review. |
| Rich data diffs | `diffCsvComponent()` detects schema, row, and cell changes for structured datasets. |
| Notebook diff viewer | `diffNotebookComponent()` detects added, removed, modified, and reordered cells, plus code-touch counts. |
| Computation-aware reproducibility | `buildReproducibilityPlan()` checks environment metadata, notebook pipeline commands, schema validation, last run version, and sandbox profile. |
| Rollback and timeline review | `buildRollbackPlan()` emits restore hashes and target-to-base version rollback actions. |
| Repository identifiers and citation | `buildCitationMetadata()` emits repository DOI, version DOI, APA, BibTeX, version, and license metadata. |
| Programmatic access and export | `src/server.js` exposes manifest, diff, review, rollback, and export endpoints; `buildExportBundle()` lists REST and CLI surfaces. |
| Reviewer-ready local demo | `README.md`, `demo/demo-text.txt`, tests, and API smoke commands make the module reproducible without credentials. |

## Differentiation From Existing #10 PRs

Existing #10 submissions mostly implement broad repository ledgers, release engines, or all-in-one version control modules. This module stays narrower: it gives maintainers a concrete structured diff and rollback review surface for scientific data, notebooks, metadata, and large result artifacts before a merge request is accepted.
