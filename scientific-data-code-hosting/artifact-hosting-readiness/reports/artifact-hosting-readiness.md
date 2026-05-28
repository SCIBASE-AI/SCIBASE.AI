# Artifact Hosting Readiness

Bundle: bundle-multimodal-assay-001
Decision: block-artifact-publication
Risk score: 100
Artifacts: 3
Visibility: public
Runtime mode: missing
Audit digest: 11d239be28b2ac0a

## Artifact Counts
- code: 1
- dataset: 1
- model: 1

## Findings
- [blocker] Artifact lacks an integrity digest: data/raw-assay.csv has no sha256 digest.
  Action: Generate an integrity digest before storing, diffing, or executing the artifact.
- [high] Artifact exceeds configured storage limits: data/raw-assay.csv is 1200000 bytes, above 1000000.
  Action: Route the artifact through large-object storage with resumable upload and quota approval.
- [medium] Dataset lacks a metadata-aware schema preview: data/raw-assay.csv has no inferred schema preview.
  Action: Infer columns, types, and row counts before showing the dataset as reusable.
- [medium] Code artifact lacks diff support: code/train_model.py cannot be diffed across upload versions.
  Action: Enable code-aware diffs for scripts, notebooks, and environment files.
- [high] Artifact file type is not supported by the hosting preview layer: models/checkpoint.bin has type=bin.
  Action: Add a supported preview/execution handler or reject the upload before publication.
- [high] Hosted artifact bundle lacks a persistent identifier: bundle-multimodal-assay-001 identifier=missing.
  Action: Attach a DOI or UUID before indexing the bundle as findable.
- [high] Reusable artifact bundle lacks a license: bundle-multimodal-assay-001 has no reuse license.
  Action: Set a data/code license before public sharing or API export.
- [high] Structured metadata is incomplete: bundle-multimodal-assay-001 datacite=false jsonLd=true schemaOrg=false.
  Action: Generate DataCite, JSON-LD, and schema.org metadata before DOI registration or discovery indexing.
- [medium] FAIR discovery metadata is thin: bundle-multimodal-assay-001 keywords=0 variables=0.
  Action: Add scientific keywords, variables, instruments, organisms, or method tags.
- [blocker] Public bundle contains restricted data: bundle-multimodal-assay-001 is public while at least one artifact is restricted.
  Action: Keep restricted artifacts private or remove them from the public bundle.
- [medium] Artifact access audit logging is disabled: bundle-multimodal-assay-001 has no access audit log.
  Action: Enable audit logs for downloads, previews, and execution events.
- [high] Executable artifacts lack a runtime environment: bundle-multimodal-assay-001 has no container image or environment file.
  Action: Attach a Docker image, Dockerfile, or environment.yml before enabling execution.
- [blocker] Execution sandbox is disabled: bundle-multimodal-assay-001 would run code without sandbox enforcement.
  Action: Enable sandbox isolation before notebooks, scripts, or model workflows can execute.
- [medium] Sandbox limits exceed policy: bundle-multimodal-assay-001 cpu=16 memoryGb=64.
  Action: Require compute approval or reduce resource limits before scheduled runs.
- [high] No reproducibility trigger is configured: bundle-multimodal-assay-001 has no run-analysis or reproduce-results trigger path.
  Action: Add a notebook, script, or workflow trigger that rebuilds results from hosted artifacts.
- [high] Artifact bundle version is invalid: bundle-multimodal-assay-001 currentVersion=first-release.
  Action: Use a semantic version tag for data/code bundle publication.
- [medium] Upload diff manifest is missing: bundle-multimodal-assay-001 has no diff manifest for the current upload.
  Action: Generate a file-level diff manifest so reviewers can inspect changes across versions.
- [medium] Rollback checkpoint is missing: bundle-multimodal-assay-001 cannot roll back to a known-good artifact state.
  Action: Create a rollback checkpoint before accepting large artifact changes.

## Safety
- Synthetic artifact bundle only; no private files, storage backends, execution sandboxes, credentials, or external APIs.
