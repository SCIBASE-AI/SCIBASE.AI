# Supplementary Media Accessibility Guard

This module is a focused Scientific/Engineering Data & Code Hosting slice for SCIBASE issue #14. It validates hosted supplementary media before public previews, API access, archive exports, or reviewer packets are released.

The guard checks:

- alt text for images, figure panels, and thumbnails
- captions for figures, microscopy clips, and protocol videos
- transcript and timecoded segment coverage for videos
- thumbnail provenance against the source artifact checksum
- checksum and metadata parity between source media and previews
- embargo and restricted-access state before public release
- DataCite and schema.org accessibility metadata readiness
- deterministic reviewer actions to release, revise, or hold previews

It is intentionally separate from broad FAIR manifests, artifact package integrity, preview cache/version drift, raw-instrument previews, notebook previews, retention/tombstones, model-card lineage, license metadata, sensitive redaction, schema evolution, data dictionaries, persistent identifiers, SBOM/advisory checks, upload checkpoints, replica consistency, column sensitivity, malware/archive quarantine, and sandbox egress. This slice focuses on accessibility and provenance readiness for supplementary scientific media.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

Generated reviewer artifacts:

- `reports/clean-media-packet.json`
- `reports/risky-media-packet.json`
- `reports/media-accessibility-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.mp4`

## Safety

All fixtures are synthetic. The module does not call live media stores, private projects, uploaded datasets, customer portals, payment systems, credential stores, external APIs, or financial accounts.
