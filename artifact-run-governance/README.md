# Artifact Run Governance

Self-contained Scientific/Engineering Data & Code Hosting module for SCIBASE issue #14. It focuses on artifact access and compute-run governance: file type classification, metadata-aware previews, large object handling, sensitive artifact quarantine, access/license gates, executable environment readiness, compute trigger eligibility, scheduled rerun review, dataset/notebook version diffs, export redaction, retention policy, and reviewer-ready governance packets.

## Scope

- Classify datasets, notebooks, code/environments, models, archives, and supplementary artifacts.
- Build a storage manifest with content hashes, previous hashes, large-object flags, previews, sensitivity, license, and access level.
- Gate artifacts for public release, controlled access, or quarantine.
- Detect sensitive raw human-derived artifacts.
- Warn when model cards or dependency pinning are missing.
- Summarize dataset and notebook version diffs.
- Evaluate Dockerfile/environment readiness for executable research.
- Decide whether manual and scheduled compute triggers are runnable, need review, or blocked.
- Build export decisions for public ZIPs and controlled reviewer packages.
- Produce retention policy and deterministic audit hashes.
- Expose local API endpoints and tests for reviewer validation.

No object store, Docker daemon, Kubernetes cluster, DOI provider, or external service is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4369 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4369/api/health
curl -fsS http://localhost:4369/api/manifest
curl -fsS http://localhost:4369/api/access-gates
curl -fsS http://localhost:4369/api/version-diffs
curl -fsS http://localhost:4369/api/environment
curl -fsS http://localhost:4369/api/compute-triggers
curl -fsS http://localhost:4369/api/exports
curl -fsS http://localhost:4369/api/retention
curl -fsS http://localhost:4369/api/governance-packet
```

## Demo Flow

1. Open `/api/manifest` to inspect classified artifacts, hashes, previews, and large object flags.
2. Open `/api/access-gates` to see sensitive raw data quarantine, public release review, and model card warnings.
3. Open `/api/version-diffs` to inspect dataset and notebook change impact.
4. Open `/api/environment` and `/api/compute-triggers` to see environment hardening and runnable/blocked compute decisions.
5. Open `/api/exports` to see public and controlled package redaction decisions.
6. Open `/api/governance-packet` for the full reviewer-ready evidence bundle.

See `docs/requirement-map.md` for issue requirement coverage.
