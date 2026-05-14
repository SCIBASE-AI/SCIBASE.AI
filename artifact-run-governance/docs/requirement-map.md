# Requirement Map

This module addresses SCIBASE issue #14 by adding a focused artifact access and compute-run governance layer for scientific data/code hosting.

| Issue requirement | Implementation evidence |
| --- | --- |
| Support major file types | `classifyArtifact()` identifies datasets, notebooks, environments, models, archives, and supplementary files. |
| Folder-based organization | Sample artifact paths cover `data/`, `raw/`, `notebooks/`, `models/`, Dockerfile, and environment files. |
| Metadata-aware previews | Classifications emit tabular, notebook, model-card, environment, and metadata preview types. |
| Upload versioning and diffing | `summarizeVersionDiffs()` reports dataset and notebook version diff impact from previous/current hashes. |
| Structured metadata and FAIR readiness | Storage manifest includes hashes, license, sensitivity, access level, variables, row counts, and metadata completeness signals. |
| Access control | `evaluateAccessGates()` decides release-ready, needs-review, or quarantine for each artifact. |
| Sensitive artifact handling | Raw human-derived artifacts are quarantined before public/export access. |
| Executable environments | `evaluateEnvironmentReadiness()` checks Dockerfile/environment presence and dependency pinning. |
| Sandboxed execution | Compute triggers include sandbox profiles such as `no-network` and `restricted-network`. |
| Compute triggers | `evaluateComputeTriggers()` evaluates manual and weekly rerun triggers for missing/quarantined artifacts and runtime/network review. |
| Scheduled reruns | Weekly rerun trigger is reviewed for network and long-runtime policy. |
| Export bundles | `buildExportDecisions()` creates public ZIP and controlled reviewer package inclusion/redaction decisions. |
| Long-term storage | `buildRetentionPolicy()` assigns retention periods and storage tiers. |
| Reviewer-ready local demo | `src/server.js`, tests, README commands, and `demo/demo-text.txt` expose reproducible local API validation. |

## Differentiation From Existing #14 PRs

Existing #14 submissions mostly implement broad FAIR manifests, metadata exports, artifact capsules, or storage ledgers. This module focuses on the governance decisions needed before hosted artifacts can be opened, exported, or executed: access/license gates, quarantine, environment readiness, compute trigger eligibility, scheduled rerun review, export redaction, and retention policy.
