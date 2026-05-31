# Scientific Bounty Escrow Readiness Guard

Self-contained reviewer artifact for the Scientific Bounty System bounty.

This module checks whether a scientific challenge has enough funded escrow
coverage before teams are allowed to invest time in submissions. It focuses on
funding readiness, not review scoring, duplicate detection, scope control, or
final payout routing.

## Scope

- Validate total prize amount, milestone allocations, sponsor deposit, platform
  reserve, honorable mention budget, cancellation/refund window, and team split
  coverage.
- Produce deterministic publish/hold/remediation decisions before submissions
  open.
- Use synthetic data only. No payment rails, bank accounts, wallets, private
  sponsor data, off-ramp claims, exchange claims, or external APIs.

## Commands

```bash
node scientific-bounty-escrow-readiness-guard/test.js
node scientific-bounty-escrow-readiness-guard/demo.js
node scientific-bounty-escrow-readiness-guard/render-video.js
node --check scientific-bounty-escrow-readiness-guard/index.js
node --check scientific-bounty-escrow-readiness-guard/sample-data.js
node --check scientific-bounty-escrow-readiness-guard/test.js
node --check scientific-bounty-escrow-readiness-guard/demo.js
node --check scientific-bounty-escrow-readiness-guard/render-video.js
```

The demo writes JSON, Markdown, SVG, and MP4 reviewer artifacts under
`scientific-bounty-escrow-readiness-guard/reports/`.
