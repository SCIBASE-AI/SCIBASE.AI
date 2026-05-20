# Repository Environment Drift Review Packet

Baseline: repo-v1.4.2
Candidate: repo-v1.5.0-rc1
Decision: quarantine-release
Semantic version impact: major
Digest: 843791061afd1911e3012e8ca1936caa9c7a7fa63a09df4e5eaacc51eef5fddb

## Blockers

- large-file-not-routed-through-lfs
- high-severity-environment-drift
- stale-reproducibility-rerun
- low-reproducibility-confidence

## Reviewer Tasks

- lfs-routing: data/crispr-screen.parquet is 517 MB and must be routed through Git LFS before release.
- environment-drift: dockerfileHash changed from sha256:docker-py311-r43 to sha256:docker-py312-r44.
- environment-drift: condaLockHash changed from sha256:conda-py311-r43 to sha256:conda-py312-r44.
- environment-drift: python changed from 3.11.8 to 3.12.3.
- environment-drift: r changed from 4.3.2 to 4.4.0.
- environment-drift: cuda changed from 12.2 to 12.4.
- environment-drift: notebookKernel changed from python-3.11-scibase to python-3.12-default.
- environment-drift: systemPackages changed from libxml2=2.11.7, openssl=3.2.1 to libxml2=2.12.6, openssl=3.3.0.
- rerun-required: Last reproducibility rerun is 32 days old; rerun raw data to results before tagging.
