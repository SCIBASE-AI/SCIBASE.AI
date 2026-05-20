# Repository Environment Drift Gate

This module is a focused slice for SCIBASE.AI issue #10, Project Repository & Version Control.

It compares a baseline scientific repository snapshot with a release candidate and blocks releases when environment drift would make the result history unreliable. The sample data is synthetic and dependency-free.

## What It Covers

- File and metadata versioning through component hashes.
- Git-compatible release and rollback tags.
- Computation-aware reproducibility through Docker, Conda, kernel, CUDA, package, and rerun evidence.
- Git LFS routing checks for large data artifacts.
- Semantic version impact recommendations.
- Quarantine and rollback packets for release managers.

## Run

```bash
node repository-environment-drift-gate/test.js
node repository-environment-drift-gate/demo.js
```

Demo output is written to:

- `reports/drift-audit.json`
- `reports/environment-drift.svg`
- `reports/review-packet.md`
- `reports/demo.mp4`
