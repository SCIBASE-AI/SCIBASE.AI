# Scientific Bounty Provenance Guard

This module adds a solver-side provenance and duplicate-submission guard for a
scientific bounty marketplace. It is intentionally separate from intake,
scoring, arbitration, escrow, IP transfer, export-control, and accessibility
workflows already represented by other issue #18 submissions.

## Purpose

Scientific bounty sponsors need a lightweight gate before payout review begins:

- verify each submission declares artifact hashes and dataset/license provenance;
- identify exact artifact reuse across different solver teams;
- flag near-duplicate abstracts that may indicate derivative or recycled work;
- produce deterministic release, revise, or hold recommendations for reviewers.

The guard does not process payments, store private data, call external APIs, or
make legal conclusions. It only prepares a reproducible reviewer packet.

## Usage

```bash
npm test
npm run demo
```

## Decision Model

- `release`: submission has complete provenance and no duplicate signal.
- `revise`: submission can proceed after missing hash/license/repro notes are fixed.
- `hold`: duplicate hashes or near-duplicate scientific rationale require review
  before payout, IP transfer, or sponsor acceptance.

## Files

- `src/index.js`: guard implementation.
- `test/provenanceGuard.test.js`: deterministic Node test suite.
- `examples/submissions.json`: sample challenge packet.
- `artifacts/reviewer-report.md`: reviewer-facing demo report.
- `artifacts/summary.svg` and `artifacts/summary.png`: visual summary artifacts.
- `artifacts/demo.mp4`: short demo video for bounty review.
