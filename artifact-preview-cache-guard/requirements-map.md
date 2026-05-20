# Requirements Map

| Issue #14 requirement | Coverage in this module |
| --- | --- |
| Support datasets, code files, supplementary files, images, videos, and models | Classifies common artifact extensions into dataset, code, image, media, model, or supplement preview lanes. |
| Metadata-aware previews | Verifies preview kind, content hash, upload version, schema version, and metadata digest before reuse. |
| Upload versioning and diffing | Compares previous and current dataset columns and reports added or removed fields. |
| Structured metadata and FAIR compliance | Warns on missing title, license, creators, DOI, or persistent ID metadata. |
| Access control for reusable hosted assets | Holds previews that expose sensitive fields before they are displayed or exported. |

## Non-Overlap Note

This submission is distinct from broad data/code hosting ledgers, FAIR manifest validators, artifact access gates, package integrity gates, quarantine/rerun governance, provenance chains, storage quota/deduplication ledgers, and executable-environment drift modules. It focuses specifically on preview cache correctness, upload-version drift, metadata snapshots, and sensitive-field preview safety.
