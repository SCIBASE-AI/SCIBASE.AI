# Repository Retention Legal Hold Gate

Self-contained review slice for issue #10, Project Repository & Version Control.

This module evaluates whether a scientific project repository version can be published, exported, or destructively changed while preserving retention rules and active legal holds. It focuses on repository lifecycle governance rather than access review, DOI tombstones, dependency licensing, merge queues, environment drift, or sensitive-artifact scanning.

## What it checks

- Active legal holds blocking destructive repository actions.
- Archive evidence for manuscript, dataset, code, and result components before release.
- Content hashes for reproducibility and rollback integrity.
- Export bundle manifest hashes for tagged versions.
- Deterministic reviewer reports for release decisions.

## Files

- `index.js` - retention and legal-hold evaluator.
- `sample-data.js` - synthetic repository scenarios only.
- `test.js` - Node.js built-in test suite.
- `demo.js` - generates reviewer artifacts in `reports/`.
- `reports/decision.json` - generated machine-readable decisions.
- `reports/report.md` - generated reviewer packet.
- `reports/retention-gate.svg` - generated visual summary.
- `reports/demo.mp4` - short demo video artifact for bounty review.

## Run

```bash
node repository-retention-legal-hold-gate/test.js
node repository-retention-legal-hold-gate/demo.js
```

## Safety

The sample data is synthetic. The module performs no network calls, scans no real repositories, and contains no secrets, tokens, private dashboard data, payout information, or patient data.
