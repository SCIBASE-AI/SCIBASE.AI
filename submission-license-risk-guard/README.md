# Submission License Risk Guard

This module adds a focused pre-review guard for the Scientific Bounty System in issue #18. It checks whether a solver submission package can safely move into sponsor review without exposing the platform to third-party license conflicts, vulnerable dependencies, restricted dataset redistribution, model-weight usage limits, or export-sensitive artifact mistakes.

The slice is intentionally narrow. It is not another challenge intake, scoring, arbitration, payout, prequalification, evidence-freeze, data-room, award-transparency, benchmark-leakage, or cancellation module. It focuses on the handoff between a submitted deliverable package and sponsor/reviewer access.

## What It Checks

- Code, data, model, and documentation license compatibility against challenge policy.
- Missing attribution notices and license texts for redistributed artifacts.
- Unpinned direct dependencies that undermine reproducibility.
- Critical or high-severity dependency advisories that require a patched version.
- Dataset redistribution limits, consent requirements, and restricted-use handling.
- Model commercial-use, weight redistribution, and training-data provenance limits.
- Export-sensitive or controlled artifacts that need sponsor policy acknowledgement.
- Reviewer-ready remediation actions and deterministic audit digests.

## Local Validation

```bash
npm test
npm run check
npm run demo
```

The demo uses synthetic local data only. It writes JSON packets, a Markdown reviewer report, an SVG summary, and a short MP4 walkthrough under `reports/`.
