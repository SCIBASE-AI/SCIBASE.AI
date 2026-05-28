# Repository Integrity Audit

Project: Neuro Marker Reproducibility Study (proj-neuro-marker-001)
Decision: block-project-release
Risk score: 100
File count: 5
Release version: release-one
Audit digest: 9f62f657f4b3c516

## Areas Present
- manuscript/
- data/
- code/
- results/
- metadata/

## Findings
- [high] Required project repository area is missing: proj-neuro-marker-001 has no files in notebooks/.
  Action: Add at least one tracked artifact under notebooks/ before tagging this project version.
- [high] Required project repository area is missing: proj-neuro-marker-001 has no files in protocols/.
  Action: Add at least one tracked artifact under protocols/ before tagging this project version.
- [blocker] Tracked file hash does not match content: data/raw-observations.csv digest does not match the current content payload.
  Action: Recompute the manifest after the file is saved, or block the export as tampered/stale.
- [high] Large artifact is not marked for Git LFS: data/raw-observations.csv is 1800000 bytes and exceeds the LFS threshold.
  Action: Store large datasets, notebooks with embedded outputs, and model artifacts through Git LFS.
- [medium] schema.org metadata type is missing or unexpected: proj-neuro-marker-001 schemaOrgType=Dataset.
  Action: Add schema.org ScholarlyArticle metadata to improve discoverability and export quality.
- [medium] Author metadata lacks ORCID: Jordan Park has no ORCID in metadata.json.
  Action: Request ORCID or mark the author as externally unverified before DOI minting.
- [high] Public release lacks DOI metadata: proj-neuro-marker-001 is marked public but has no DOI.
  Action: Mint or reserve a DOI before publishing the tagged release.
- [blocker] Release tag is not a valid semantic version: proj-neuro-marker-001 release version=release-one.
  Action: Use a vMAJOR.MINOR.PATCH tag before export or DOI citation.
- [blocker] Version history lacks base or head commit: proj-neuro-marker-001 base=missing head=7c8b9d0.
  Action: Record base and head commits so rollback, provenance, and export bundle verification work.
- [high] Release contains unreviewed changes: proj-neuro-marker-001 has 3 unreviewed changes.
  Action: Require merge request review before tagging the project repository.
- [high] Fork provenance lacks attribution: proj-neuro-marker-001 is a fork without parent project attribution.
  Action: Store parent project ID and attribution text before allowing publication or export.
- [high] Merge request has no reviewer approval: proj-neuro-marker-001 requires MR review but has no reviewers.
  Action: Require at least one reviewer approval before merging research changes into a release branch.
- [medium] Merge request still has unresolved discussions: proj-neuro-marker-001 has 2 unresolved discussions.
  Action: Resolve open review discussions before tagging the release.
- [high] No reproducibility pipeline is configured: proj-neuro-marker-001 has no pipeline path for auto-execution.
  Action: Add a reproducibility pipeline that rebuilds results from raw data and code.
- [blocker] Last reproducibility run did not pass: proj-neuro-marker-001 last run status=failed.
  Action: Block citation/export until the sandboxed reproducibility run passes.
- [medium] Runtime environment is not pinned: proj-neuro-marker-001 lacks a container image or conda environment file.
  Action: Pin a container image or conda environment before claiming reproducible results.

## Safety
- Synthetic project repository manifest only; no private data, Git remotes, DOI providers, credentials, or external APIs.
