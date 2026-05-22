# Repository Sensitive Artifact Guard

This module is a dependency-free, synthetic-data-only guard for SCIBASE Project
Repository & Version Control. It evaluates commit, tag, merge request, and
export bundle metadata before sensitive artifacts become durable in scientific
repository history.

## What It Checks

- Synthetic credential and private-key indicators.
- PHI-like or raw participant identifier signals.
- Restricted datasets accidentally routed to public export or DOI snapshot
  surfaces.
- Notebook output leakage before reproducibility artifacts are tagged.
- Sensitive path names such as `.env`, credentials files, or key material.
- Large datasets, model weights, and binary results that should be routed
  through Git LFS.
- Deterministic rewrite, remediation, LFS routing, and rollback packets.

## Local Commands

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts under `reports/`:

- `sensitive-artifact-packet.json`
- `sensitive-artifact-report.md`
- `summary.svg`
- `demo.mp4`

## Requirements Map

| Issue #10 requirement | Coverage in this slice |
| --- | --- |
| Repository structure and components | Evaluates manuscript, data, code, notebook, results, protocols, and metadata paths. |
| File and metadata versioning | Produces commit-level decisions, audit digests, and rollback packets before merge/tag/export. |
| Git LFS support | Flags large datasets, model weights, and binary results that are not LFS pointers. |
| Collaboration and merge requests | Blocks merge/tag/export surfaces until steward remediation is complete. |
| Export bundles and DOI snapshots | Prevents restricted or sensitive synthetic artifacts from entering public release surfaces. |

## Safety Boundaries

- Uses only synthetic fixtures in `sample-data.js`.
- Does not scan real repositories, real secrets, patient data, private projects,
  credentials, Git providers, or external services.
- Does not include real secret values, participant identifiers, or institutional
  data.
