# Challenge Debrief Feedback Release Guard

This folder contains a dependency-free synthetic guard for the SCIBASE Scientific Bounty System. It focuses only on post-evaluation solver debrief packets, after review and scoring are complete but before feedback is released to winner, finalist, and non-winner teams.

The guard gives challenge operators a deterministic release decision:

- `release_debrief`: no findings in the solver-facing packet.
- `release_with_monitoring`: only warning-level issues remain.
- `revise_before_release`: high-severity issues require a packet edit.
- `hold_debrief_release`: critical leaks or payment-routing risks block release.

## What It Checks

- Equal rubric-linked feedback coverage for every solver team.
- Actionable comments that tell solvers what to preserve, revise, or add.
- Appeal deadline consistency with the accepted challenge policy.
- Reviewer anonymity and reviewer identity redaction.
- Private sponsor benchmark and holdout label redaction.
- Other team IP and protected method redaction.
- Civility and defamation risk in solver-facing language.
- Prohibited direct payment, payout negotiation, or off-platform payment language.
- Deterministic release target and team routing validation.

## Synthetic Scope

All sample packets are synthetic. The module does not use credentials, private challenge data, payment accounts, external APIs, platform webhooks, or live solver submissions. Payment-related strings appear only as detector fixtures to ensure unsafe debrief language is blocked before release.

This is intentionally separate from existing bounty slices for intake compliance, rubric readiness, scoring, arbitration, reviewer consensus, award transparency, appeals handling, milestone progress, clarification freeze, evidence freeze, IP redaction at source, payout eligibility, payout routing, escrow, data-room access, benchmark leakage during evaluation, deadline fairness, and sponsor regulatory attestation. It guards the final feedback packet itself.

## Run

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

`npm run demo` writes:

- `reports/debrief-release-packet.json`
- `reports/debrief-release-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## API

```js
const { evaluateDebriefPacket } = require("./index");

const result = evaluateDebriefPacket(packet, {
  now: "2026-06-01T09:00:00.000Z"
});

console.log(result.decision);
```

Packets should include challenge metadata, accepted rubric items, participating teams, optional reviewer identities for redaction checks, and one solver-facing debrief per team.
