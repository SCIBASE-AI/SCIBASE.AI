# Artifact Quarantine Rerun Governance

This module adds a focused Scientific/Engineering Data & Code Hosting slice for artifact safety and reproducible compute readiness. It avoids live storage or container execution and instead produces deterministic reviewer evidence from synthetic project data.

## What it checks

- Scientific artifact type and preview safety for datasets, notebooks, figures, models, and environment specs
- Sensitive data quarantine for human-subjects data, raw identifiers, secrets, and missing de-identification evidence
- Metadata completeness for DOI/DataCite-style discovery and FAIR reuse
- License and access gates before public export
- Pinned executable environment readiness for Docker, Conda, and notebook reruns
- Compute trigger eligibility, including quarantined inputs, stale environments, schedule approval, and budget limits
- Retention and export actions plus a deterministic audit digest

## Run locally

```bash
npm run check
npm test
npm run demo
```

The sample bundle intentionally blocks one patient-level dataset and one scheduled rerun, while allowing a public aggregate table and a locked Python analysis run.

## Demo video

The reviewer demo is at `docs/artifact-quarantine-rerun-demo.mp4`. It shows a terminal-style walkthrough of `npm run check`, `npm test`, and `npm run demo` using the current module output.
