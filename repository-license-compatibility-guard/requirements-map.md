# Requirements Map

| Issue #10 area | Coverage |
| --- | --- |
| Repository structure and components | Evaluates code, dataset, notebook, model, and figure assets in a release manifest. |
| File and metadata versioning | Binds decisions to a repository ID and semantic version tag. |
| Collaboration and forking | Checks fork-derived asset license continuity and attribution. |
| Computation-aware reproducibility | Holds model/notebook assets when source or license evidence is incomplete. |
| Repository identifiers and citation | Blocks DOI/export publication when license and attribution evidence is unsafe. |
| Programmatic access and export | Produces deterministic decision packets for export-bundle gating. |

## Non-overlap

This is not a broad repository ledger, release engine, structured diff/rollback,
provenance attestation, release embargo, notebook replay, schema migration,
citation impact, API/export, merge queue, environment drift, access review,
DOI tombstone, metadata readiness, branch lineage, or sensitive-artifact commit
slice. It focuses on dependency, dataset, model, and generated-artifact license
compatibility before release/export.
