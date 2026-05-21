# Sponsor Data-Room Access Guard

This module adds a focused data-room access and revocation guard for the Scientific Bounty System. It covers the private-challenge handoff after sponsor intake and before solver/reviewer work begins: dataset grants, NDA and prequalification readiness, least-privilege role checks, expiry warnings, stale access reviews, and sponsor remediation packets.

It is intentionally separate from the existing challenge intake, rubric readiness, arbitration, scoring, anti-collusion, payout eligibility, IP redaction, evidence freeze, clarification freeze, and award transparency slices.

## What It Checks

- Solver, reviewer, arbiter, and sponsor grants have required metadata.
- Solver/reviewer grants are read-only unless an arbitration exception exists.
- NDA acceptance and prequalification are complete before private data-room access.
- Expired grants are blocked and near-expiry grants produce sponsor warnings.
- Stale access creates review audit events so private challenge data is not left open.
- Reports are synthetic-data-only and safe for reviewers to inspect.

## Files

- `index.js` - deterministic access evaluation and report rendering logic.
- `sample-data.js` - synthetic challenge grants used by tests and demo.
- `test.js` - dependency-free Node assertions.
- `demo.js` - generates JSON, Markdown, and SVG artifacts in `reports/`.
- `reports/data-room-access-packet.json` - machine-readable review packet.
- `reports/data-room-access-report.md` - sponsor remediation report.
- `reports/summary.svg` - visual summary for quick review.
- `reports/demo.mp4` - short generated demo video.

## Validation

```bash
node sponsor-data-room-access-guard/test.js
node sponsor-data-room-access-guard/demo.js
node --check sponsor-data-room-access-guard/index.js sponsor-data-room-access-guard/sample-data.js sponsor-data-room-access-guard/test.js sponsor-data-room-access-guard/demo.js
```

Expected demo output:

```text
status=hold_data_room, blockers=5, warnings=3
```

## Scientific Bounty Fit

Sponsors often need to share private datasets, protocols, notebooks, or pre-release research artifacts with solver teams. This guard creates a lightweight control plane so the platform can pause a challenge data room before access is opened too broadly, then hand reviewers a deterministic audit packet with clear remediation actions.
