# Dataset Split Release Guard

This contribution adds a focused release guard for train/validation/test split manifests in SCIBASE's Scientific/Engineering Data & Code Hosting layer. It checks whether hosted dataset split artifacts are safe before DOI publication, API release, public previews, or reproducibility badges.

The slice is intentionally narrow. It does not rebuild broad FAIR manifests, artifact package integrity, schema evolution, data dictionaries, malware quarantine, sandbox egress, notebook rerun determinism, spreadsheet formula provenance, accessibility previews, SBOM checks, or general license metadata. It covers the release boundary for split artifacts.

## What It Checks

- Required train, validation, and test split manifests.
- Dataset record count parity with split record totals.
- Record identifier overlap across splits.
- Group-level leakage across participant, patient, subject, lab, or other grouping identifiers.
- Deterministic seed and split-script hash provenance.
- Per-split checksum and manifest-hash coverage.
- License and access-state parity across split artifacts.
- Class or stratum balance drift beyond release policy.
- Embargoed records present in public split manifests.
- Public DOI/API release left enabled while split-integrity findings are unresolved.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic split release packets in `data/sample_split_release_packets.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

Data/code hosting is not only about storing files. A hosted dataset often becomes the basis for reproduced results, model comparisons, public APIs, and DOI-backed artifacts. If train, validation, and test manifests leak records or participant groups across boundaries, downstream analyses can look reproducible while being contaminated.

This guard gives SCIBASE a deterministic packet to hold risky releases, regenerate split manifests, preserve checksum evidence, and keep public releases frozen until split artifacts are safe.
