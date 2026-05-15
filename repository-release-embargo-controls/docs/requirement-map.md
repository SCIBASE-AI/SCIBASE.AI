# Requirement Map

| Project Repository & Version Control requirement | Implementation |
| --- | --- |
| Structured scientific project repositories | `sample-data.json` models repository metadata, components, versions, access policies, release candidates, and reproducibility runs. |
| File, dataset, and notebook versioning | `componentManifest` normalizes typed files, notebooks, metadata, hashes, sizes, restrictions, and license fields. |
| Scientific commit/release readiness | `analyzeRepositoryReleaseControls` evaluates a release candidate against embargo, access, citation, reproducibility, export, and rollback controls. |
| Large file handling | `large-file-lfs-routing` blocks artifacts above 100 MB unless they have an LFS or object-store pointer. |
| Reproducibility checks | Required pipeline IDs must have latest passed runs with `sha256` output hashes. |
| DOI and citation support | DOI/reserved DOI and citation metadata are validated before export. |
| Exporting and archival | Required export files include metadata, license, citation, manifest, and checksums. |
| Rollback and auditability | Parent versions need rollback snapshot hashes, and every evaluation returns a deterministic `sha256` audit digest. |

## Demo Video

The PR includes `docs/repository-release-demo.mp4`, a real terminal walkthrough running the local check, test, and demo scripts.
