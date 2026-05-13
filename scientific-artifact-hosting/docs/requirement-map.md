# Requirement Map

| Issue #14 requirement | Implementation evidence |
| --- | --- |
| Scalable storage for major file types | `buildArtifactManifest` classifies datasets, code, notebooks, images, models, figures, and raw outputs. |
| Folder organization and upload versioning | Artifact `path`, `version`, `previousVersionId`, and manifest grouping. |
| Metadata-aware previews | `selectPreview` maps spreadsheets, notebooks, images, code, JSON, and models to preview modes. |
| Dataset version diffing | `diffArtifactVersions` reports added/removed/changed schema columns and row deltas. |
| JSON-LD/DataCite/schema.org metadata | `buildMetadataExports` emits all three payloads. |
| FAIR compliance | `evaluateFairCompliance` checks identifiers, access URLs, machine-readable formats, APIs, license, metadata, and versioning. |
| Tagging system | `buildTagIndex` groups keywords, instruments, organisms, and variables. |
| Executable environments | `buildRuntimePlan` models Docker/Conda/Kubernetes environment specs. |
| Sandboxed runs and compute triggers | `buildRunPlan` and `buildComputeTriggers` model notebook/script/model execution and scheduled reruns. |
