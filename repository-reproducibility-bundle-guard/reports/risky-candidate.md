# Repository Reproducibility Bundle Guard

Scenario: risky-candidate

Repository: repo-incomplete-export
Release tag: preprint-v2.2.0
Decision: HOLD

Reviewed 5 manifest components and 2 bundle entries.

## Findings

- HIGH MISSING_REQUIRED_COMPONENT: notebook component is absent from the release manifest.
- HIGH MISSING_REQUIRED_COMPONENT: results component is absent from the release manifest.
- HIGH MISSING_REQUIRED_COMPONENT: protocol component is absent from the release manifest.
- HIGH DUPLICATE_MANIFEST_PATH: code/train.py appears more than once in the release manifest.
- HIGH INVALID_COMPONENT_DIGEST: manuscript/main.md does not carry a valid SHA-256 digest.
- MEDIUM MISSING_DATA_PROVENANCE: data/observations.parquet lacks provenance references to inputs, instruments, or analysis commits.
- HIGH MISSING_RUNTIME_LOCKFILE: code/train.py lacks lockfile evidence for executable reproducibility.
- MEDIUM UNPINNED_RUNTIME_IMAGE: code/train.py runtime image is not digest-pinned.
- HIGH MISSING_RUNTIME_LOCKFILE: code/train.py lacks lockfile evidence for executable reproducibility.
- MEDIUM UNPINNED_RUNTIME_IMAGE: code/train.py runtime image is not digest-pinned.
- HIGH UNVERSIONED_COMPONENT: metadata.json is not marked as version-controlled.
- LOW MISSING_METADATA_EXPORT_TARGETS: metadata.json does not declare export targets.
- HIGH INCOMPLETE_RELEASE_METADATA: Release metadata is missing DOI, schema.org, DataCite, or license evidence.
- MEDIUM MISSING_AUTHOR_ATTRIBUTION: Release metadata does not include author attribution.
- HIGH INVALID_EXPORT_BUNDLE: Release bundle archive path or digest is missing/invalid.
- HIGH BUNDLE_OMITS_MANIFEST_COMPONENTS: Release bundle omits manifest paths: data/observations.parquet, code/train.py.

## Release Criteria

- Every required scientific repository component is present in the manifest.
- Every manifest entry has a stable digest and version-control status.
- Executable code and notebooks include lockfile evidence and pinned runtimes.
- Datasets and results link back to provenance inputs.
- The export bundle includes every manifest path and has its own SHA-256 digest.
