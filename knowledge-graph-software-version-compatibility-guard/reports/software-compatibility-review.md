# Software Compatibility Review: rec-rna-velocity-notebook

Decision: suppress-recommendation
Generated: 2026-05-22T16:00:00Z

## Visible Paths
- None

## Suppressed Paths
- path-rna-velocity: python 3.8.18 does not satisfy >=3.10 <3.12 for RNA velocity -> Velocity rerun notebook -> Cell Atlas v3. scanpy 1.8.2 does not satisfy >=1.10 <2.0 for RNA velocity -> Velocity rerun notebook -> Cell Atlas v3. anndata 0.8.0 does not satisfy >=0.10 <0.11 for RNA velocity -> Velocity rerun notebook -> Cell Atlas v3. Container ghcr.io/scibase/velocity:latest is not pinned by digest. nextflow 22.10.6 does not satisfy >=23.10 <24.0.

## Curator Actions
- pin-compatible-runtime: python - Install python >=3.10 <3.12 before this graph path is recommended.
- update-package-lock: scanpy - Install scanpy >=1.10 <2.0 before this graph path is recommended.
- update-package-lock: anndata - Install anndata >=0.10 <0.11 before this graph path is recommended.
- pin-container-digest: ghcr.io/scibase/velocity - Record an immutable sha256 digest before exposing this path in discovery recommendations.
- upgrade-workflow-engine: nextflow - Pin nextflow >=23.10 <24.0 for rerunnable graph provenance.

---
# Software Compatibility Review: rec-spatial-transcriptomics-protocol

Decision: curator-review
Generated: 2026-05-22T16:10:00Z

## Visible Paths
- path-spatial-protocol: Spatial transcriptomics v2 -> Lung atlas matrix (score 80)

## Suppressed Paths
- None

## Curator Actions
- attach-lockfile: poetry.lock - Attach a package lockfile before this recommendation is treated as fully reproducible.
- refresh-runtime-capture: runner-991 - Run a fresh environment capture so graph recommendations reflect current software compatibility.

---
# Software Compatibility Review: rec-crispr-screen-dataset

Decision: show-recommendation
Generated: 2026-05-22T16:20:00Z

## Visible Paths
- path-crispr-screen: CRISPR pooled screen -> CRISPR screen 2026 (score 100)

## Suppressed Paths
- None

## Curator Actions
- No curator action required
