# Challenge Benchmark Holdout Leakage Guard

This module adds a benchmark holdout leakage guard for SCIBASE issue
[#18](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/18). It protects
scientific bounty scoring by checking whether private holdout data was exposed
before leaderboard or award decisions.

The slice is intentionally narrow. It does not duplicate rubric readiness,
milestone progress, evidence freeze, IP redaction, payout eligibility, reviewer
consensus, solver prequalification, data-room access, clarification freeze,
award transparency, deliverable acceptance, or reproducibility environment
work.

## What It Checks

- Holdout artifacts have stable hashes before scoring.
- Holdout release events use sealed scoring channels only.
- Holdouts are not released before the submission deadline.
- Solver workspaces were not granted sealed holdout paths.
- Public baseline hashes do not match holdout hashes.
- Sponsor exceptions are approved outside the freeze window.
- Submission packages do not contain holdout artifact hashes.

## Local Usage

```bash
cd challenge-benchmark-holdout-leakage-guard
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts under `reports/`:

- `benchmark-leakage-packet.json`
- `benchmark-leakage-report.md`
- `summary.svg`
- `demo.mp4`

All examples use synthetic challenge metadata. No external services, accounts,
private challenge files, or payment information are required.
