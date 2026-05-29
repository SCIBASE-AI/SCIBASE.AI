# Repository Embargo Release Guard

This module adds a focused guard for Project Repository & Version Control. It checks whether embargoed datasets, manuscripts, and result assets can be released into a tagged repository version or export bundle.

It is intentionally separate from broad repository ledgers, component-owner approval, semantic tags, external reference pinning, notebook diffs, fork provenance, release signatures, restore rehearsal, and compute sandboxes.

## What It Checks

- Embargo expiry against release date
- Funder or publication exceptions
- Public access group cleanup
- DOI target and export bundle parity
- Citation badge visibility
- Deterministic release or hold actions

## Demo

Run:

```bash
node repository-embargo-release-guard/test.js
node repository-embargo-release-guard/demo.js
node repository-embargo-release-guard/render-video.js
```

Generated artifacts:

- `reports/embargo-release-report.json`
- `reports/embargo-release-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call Git providers, DOI services, storage APIs, access-control systems, credentials, or SCIBASE production services.
