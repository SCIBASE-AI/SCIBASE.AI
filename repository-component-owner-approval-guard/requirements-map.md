# Requirements Map

## Issue #10 Requirement Coverage

- Repository structure and components: maps component owners across `manuscript/`, `data/`, `code/`, `notebooks/`, `protocols/`, `results/`, and `metadata.json`.
- File and metadata versioning: blocks stale approvals when changed files move after review.
- Collaboration and merge requests: evaluates merge request approval quorum before protected-branch merge.
- Provenance tracking: records which owner roles approved each component and why a merge is blocked.
- In-browser editors and diffs: treats changed paths as editor/diff outputs that need owner coverage.
- Computation-aware reproducibility: checks code, notebook, and result owners for reproducibility-sensitive changes.
- Repository identifiers and citation: requires metadata owner approval for `metadata.json` citation/version changes.

## Non-Overlap Statement

This slice is limited to component-owner approval quorum and owner freshness. It does not implement the existing repository ledger, release engine, structured diff/rollback, provenance attestation, release embargo, notebook replay, schema migration, citation impact, API/export verifier, merge queue, environment drift, access review, DOI tombstone, metadata readiness, branch hypothesis lineage, sensitive-artifact, dependency-license, or legal-hold slices.
