# Requirements Map

Source: SCIBASE.AI issue #10, Project Repository & Version Control.

| Requirement | Implementation |
| --- | --- |
| Repository component structure | `sample-data.js` models manuscript, data, code, notebook, and results components. |
| File and metadata versioning | `compareComponents()` compares component hashes across repository snapshots. |
| Git-compatible backend and rollback | `rollbackPlan` emits release tags, rollback tags, and quarantine branch actions. |
| Semantic versioning | `semanticVersionImpact()` recommends major/minor/patch impact from component and environment drift. |
| Hash-based integrity | `auditDigest` signs component diffs, environment diffs, blockers, and release decision. |
| Computation-aware reproducibility | `compareEnvironment()` checks Dockerfile, Conda lock, Python/R/CUDA versions, notebook kernel, packages, and secrets policy. |
| Container support | Dockerfile and Conda lock hashes are high-severity release gates. |
| Results reproducibility | `staleRerunDays()` and confidence thresholds block stale raw-data-to-results reruns. |
| Git LFS for large files | Large data artifacts above 100 MB require `lfs: true`; otherwise release is quarantined. |
| Reviewer-ready evidence | Demo emits JSON, Markdown, SVG, and MP4 artifacts under `reports/`. |
| Local verification | `test.js` covers component diffs, environment drift, stale reruns, semantic versioning, blockers, rollback plan, digest shape, and SVG output. |
