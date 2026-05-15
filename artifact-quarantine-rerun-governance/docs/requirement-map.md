# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#14 - Scientific/Engineering Data & Code Hosting

| Requirement | Implementation |
| --- | --- |
| Support major scientific file types | `classifyArtifact` maps CSV, TSV, XLSX, JSON, Parquet, notebooks, code, figures, model files, and environment specs into stable hosting categories. |
| Metadata-aware previews | `buildPreviewDescriptor` decides safe preview mode, disables previews for secrets and oversized files, and annotates sensitive previews. |
| Upload versioning and diffing | Artifact inputs include `version`, `previousHash`, and `diffSummary`; the audit report surfaces version and retention decisions. |
| JSON-LD, DataCite, schema.org metadata | `evaluateMetadata` checks DOI/identifier, title, creators, publisher, year, resource type, license, keywords, and JSON-LD/schema.org flags. |
| FAIR compliance | `calculateFairScore` converts findings into a deterministic FAIR readiness score and decision. |
| Access control and persistent links | `evaluateArtifact` blocks public export when licenses, access class, or sensitivity evidence are missing. |
| Executable environments | `evaluateEnvironment` validates pinned Docker digests, Conda lock hashes, notebook kernels, network policy, and storage mounts. |
| Sandboxed execution and compute triggers | `evaluateComputeTrigger` checks input quarantine, missing inputs, unpinned environments, budget, approval, and scheduled rerun policy. |
| Reviewer-ready evidence | `evaluateHostingGovernance` returns quarantine decisions, preview descriptors, compute plans, retention/export actions, and a SHA-256 audit digest. |
