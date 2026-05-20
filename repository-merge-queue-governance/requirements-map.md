# Requirements Map

Issue #10 asks for scientific project repositories that combine GitHub-style version control, Jupyter-style workspaces, collaboration, reproducibility, citation, and export workflows. This module adds a merge queue governance layer for deciding whether a scientific merge request is ready to enter the protected branch.

## Repository Structure & Components

- Tracks protected scientific components: manuscript, data, code, notebooks, metadata, results, and protocols.
- Verifies that changed files have paths, sizes, and content hashes.
- Detects generated outputs that need generator digests.

## File & Metadata Versioning

- Checks base branch freshness before merge.
- Classifies semantic version impact.
- Requires citation impact notes when metadata changes.
- Emits deterministic audit digests for merge and release records.

## Collaboration & Forking

- Requires source and target branch references.
- Blocks missing author attribution.
- Requires upstream fork attribution when a merge request derives from another repository.
- Enforces independent reviewer-role approvals.

## In-Browser Editors & Diffs

- Treats unresolved discussion threads as a merge hold.
- Summarizes protected component coverage for reviewer dashboards.

## Computation-Aware Reproducibility

- Requires passed reproducibility evidence with pipeline id and artifact digest.
- Requires content hashes and generated-output digests so results can be replayed from raw data, code, and notebooks.

## Programmatic Access & Export

- Produces machine-readable ready, held, and blocked decisions.
- Produces remediation actions that can be exposed through a REST API, CLI, or export workflow.

## Non-Goals

- No live GitHub or Git integration.
- No DOI registration or citation formatting.
- No real user, institution, project, payment, or credential data.
- No replacement for a full repository ledger; this is a merge queue readiness guard.
