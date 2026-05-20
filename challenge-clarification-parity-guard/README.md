# Challenge Clarification Parity Guard

This module adds a focused clarification parity guard for the Scientific Bounty System in issue #18. It protects challenge fairness by checking that sponsor answers, material clarifications, and attachments are visible to all eligible solver teams before evaluation continues.

The scope is distinct from broad bounty marketplaces, intake forms, arbitration/scoring ledgers, appeals, workspace privacy, anti-collusion, escrow settlement, payout eligibility, sponsor reliability, amendment-control, reviewer consensus, IP redaction, milestone progress, evidence freeze, rubric readiness, solver prequalification, deliverable acceptance, and reproducibility environment acceptance slices.

## What It Checks

- Material sponsor answers are broadcast to every eligible team.
- Clarification attachments do not give one solver private evaluation data.
- Scope-changing answers link into amendment consent and reopen the submission window.
- Sponsor responses meet the published answer SLA or publish controls.
- Anonymous participation does not leak solver team identity in Q&A packets.
- Material unanswered questions hold evaluation when past SLA.
- Clarification roots match the published Q&A packet.

## Run The Demo

From the repository root:

```bash
node challenge-clarification-parity-guard/test.js
node challenge-clarification-parity-guard/demo.js
```

The demo writes JSON, Markdown, and SVG reviewer artifacts under `challenge-clarification-parity-guard/reports/`. This submission also includes `reports/demo.mp4` rendered from the generated review summary.
