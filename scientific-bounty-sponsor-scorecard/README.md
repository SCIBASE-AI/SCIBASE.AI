# Scientific Bounty Sponsor Scorecard

This module adds a solver-facing reliability layer for the Scientific Bounty System. It helps researchers decide whether a posted bounty is ready to accept before they invest time, while giving sponsors concrete actions to improve trust.

The scorecard is intentionally different from intake, arbitration, appeals, escrow settlement, reproducibility audit, anti-collusion, workspace privacy, and amendment-control modules. It looks at sponsor reliability and challenge readiness before solver commitment.

## What It Evaluates

- Verified funding or escrow coverage for the current prize
- Review SLA and historical sponsor responsiveness
- Rubric completeness, measurable criteria, tie-break handling, and evidence expectations
- Amendment volatility after launch and whether solvers receive material-change protections
- Payout history, average payout lag, and paid-award evidence
- Dispute responsiveness and unresolved dispute exposure
- IP/NDA clarity, including whether unpaid work stays with the solver
- Public-safe audit digest that excludes private sponsor notes and payment/KYC fields

## Run Locally

```bash
npm run check
npm test
npm run demo
```

## API

```js
import { buildSponsorScorecard } from "./src/sponsor-scorecard.js";
import sample from "./data/sample-sponsor-input.json" with { type: "json" };

const report = buildSponsorScorecard(sample, {
  generatedAt: "2026-05-16T15:30:00.000Z"
});

console.log(report.summary);
```

## Outputs

- `summary`: portfolio counts and tier distribution
- `scorecards`: per-challenge score, tier, axis breakdown, findings, sponsor actions, solver guidance
- `auditDigest`: deterministic SHA-256 digest over public-safe report fields
- `sanitizedInputEcho`: redacted snapshot proving private notes and payment/KYC fields were not exported

## Demo Artifacts

- `docs/demo.svg`
- `docs/demo.mp4`
- `docs/demo.gif`

## Design Notes

The scoring axes follow established challenge-prize guidance: evaluation criteria should be measurable, judging protocols should be transparent, conflicts/NDA terms should be managed up front, and participants should understand award and eligibility conditions before doing work. See `docs/requirement-map.md` for the mapping to issue #18 and the public references reviewed.
