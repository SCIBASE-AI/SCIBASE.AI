# Challenge Evidence Freeze Gate

This module is a focused slice for SCIBASE.AI issue #18, Scientific Bounty System.

It freezes solver submission evidence at the challenge deadline, compares later sponsor/reviewer packets against the frozen manifest, and emits tamper-diff decisions before scoring, arbitration, payout, or IP transfer.

## What It Covers

- Deadline-locked artifact manifests and manifest hashes.
- Post-deadline checksum drift, metric drift, metadata drift, removals, and late-added artifacts.
- Reviewer-visible exception justifications.
- Scoring exclusions and payout/arbitration hold decisions.
- Public exception notes and reviewer task packets.
- JSON audit packets, Markdown arbitration packets, SVG summaries, and a short MP4 demo artifact.

The sample data is synthetic. The module is dependency-free and does not call external services.

## Run

```bash
node challenge-evidence-freeze-gate/test.js
node challenge-evidence-freeze-gate/demo.js
```

Demo output is written to:

- `reports/freeze-audit.json`
- `reports/arbitration-packet.md`
- `reports/freeze-gate.svg`
- `reports/demo.mp4`
