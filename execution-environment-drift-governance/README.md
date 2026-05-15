# Execution Environment Drift Governance

This module is a focused slice for SCIBASE.AI issue #14, **Scientific/Engineering Data & Code Hosting**. It covers the reproducible execution side of data/code hosting: environment fingerprints, dependency drift, artifact-to-runtime readiness, scheduled rerun decisions, retention/export evidence, and reviewer-ready requirement mapping.

It is intentionally dependency-free and credential-free. The sample data is synthetic.

## What It Adds

- Deterministic artifact capsules for datasets, notebooks, JSON supplements, scripts, and media.
- Metadata-aware preview decisions for notebook, tabular, JSON, image, code, and generic artifacts.
- FAIR scoring plus JSON-LD and DataCite payload generation for DOI/export readiness.
- Container/runtime fingerprinting with pinned image checks, dependency version drift, GPU capability changes, and network policy drift.
- Compute trigger planning for scheduled reruns and "reproduce results" workflows.
- Retention/export evidence for regulated artifacts, embargoes, DOI readiness, and audit digests.
- Requirement mapping back to issue #14 for storage, metadata, executable environments, compute triggers, and export governance.

## Demo

```bash
npm run demo
```

The demo writes:

```text
demo/execution-drift-governance-packet.json
```

That packet includes artifact digests, environment drift decisions, rerun actions, retention/export evidence, and the requirement map.

A short visual demo is included at:

```text
demo/execution-drift-governance-demo.mp4
```

## Tests

```bash
npm test
```

The tests cover:

- Stable hashing regardless of object key order.
- Artifact type detection.
- Environment fingerprint determinism.
- Blocking unpinned container images and `latest` dependencies.
- Restricted human-subject artifact gating.
- Safe scheduled rerun decisions.
- Retention/export evidence and requirement mapping.

## Requirement Map

| Issue #14 requirement | Evidence in this module |
| --- | --- |
| Scalable storage engine for datasets/code/supplementary files | Artifact capsules include type detection, content digests, preview policy, version metadata, and path organization. |
| Metadata-aware previews and versioning/diffing | Preview policy and stable artifact digests enable deterministic review and version comparison. |
| JSON-LD, DataCite, schema.org, FAIR compliance | Each artifact evaluation emits JSON-LD/DataCite payloads and FAIR score checks with DOI thresholds. |
| Executable environments | Runtime capsules are normalized and fingerprinted; drift checks cover base image, package versions, GPU, and network policy. |
| Sandboxed execution and compute triggers | Rerun plans decide `RUN_NOW`, `SCHEDULED`, `REVIEW_REQUIRED`, or `BLOCKED` using artifacts, environments, cadence, and compute budgets. |
| Export/retention governance | Retention evidence covers regulated data, embargoes, DOI readiness, and immutable evidence digests. |

## Design Notes

The module does not run untrusted code. It produces governance decisions that an execution service can consume before enabling notebook/script reruns. That keeps the slice safe and reviewable while still addressing the executable-environment requirements in the bounty.
