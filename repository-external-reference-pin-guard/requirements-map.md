# Requirements Map

Issue #10 asks for robust project repositories with versioned files, collaboration, reproducibility, identifiers, citations, programmatic access, and export bundles.

| Issue #10 area | Coverage in this slice |
| --- | --- |
| File and metadata versioning | Holds releases when Git submodules or external code are not pinned to immutable commits, including null all-zero commit placeholders. |
| Hash-based integrity | Requires full-length SHA checksums, parseable DOI evidence, or non-floating immutable versions for external datasets and model weights, and blocks malformed checksum evidence even when another identifier is present. |
| Computation-aware reproducibility | Blocks reproducibility/export lanes when API data sources are floating, authenticated only, or backed by malformed/future snapshot dates, invalid checksum evidence, or truncated checksum evidence. |
| Repository identifiers and citation | Prevents DOI publication when repository assessment timestamps are missing or malformed, or when external references lack verification timestamps, are stale, future-dated, contain malformed DOI evidence, or lack license/attribution metadata. |
| Programmatic access and export | Separates API metadata-only access from export-bundle and DOI publication release lanes, blocks malformed reference manifests or entries with explicit repair actions, holds references that lack stable IDs before reviewer remediation can become ambiguous, and redacts credential material from authenticated reference targets in findings. |

## Non-Overlap

This contribution is distinct from broad repository ledgers, release engines, structured diffs, provenance attestations, release embargo controls, notebook replay, schema migration, citation impact, API/export contract verification, merge queue governance, environment drift, access review, DOI tombstone handling, metadata readiness, branch hypothesis lineage, sensitive-artifact scanning, dependency-license checks, legal hold, component-owner approval, restore rehearsal, compute sandbox policy, and semantic version-tag governance. It focuses specifically on immutable external reference pins and exportable citation evidence for submodules, linked datasets, API sources, model weights, and external code/data pointers.
