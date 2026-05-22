# Repository License Compatibility Guard

This module provides a focused Project Repository & Version Control slice for
SCIBASE issue #10. It evaluates a synthetic repository release/export manifest
before DOI publication or partner export, checking code package licenses, dataset
licenses, model weight terms, generated figure reuse, fork attribution, SPDX
normalization, missing notices, and release-blocking conflicts.

## What It Covers

- License compatibility for tagged repository releases.
- Dataset and model export holds for proprietary, missing, or unsupported terms.
- Non-commercial license conflicts for commercial/partner export intents.
- Copyleft source-bundle and fork-license evidence checks.
- Attribution and notice completion tasks before publication.
- Deterministic reviewer packets and audit digests.

## Run

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`
- `demo.mp4`

The data is synthetic and does not scan a live repository or legal system.
