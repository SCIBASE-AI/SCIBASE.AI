# Scientific Bounty Award Publication Guard

This module adds a focused award-publication readiness guard for the Scientific Bounty System bounty.

It answers one operational question:

> Can the platform publicly announce a winner, publish the award page, and expose result metadata without violating payout, appeal, IP, NDA, embargo, or team-consent rules?

## Scope

This is intentionally separate from intake, scoring, escrow funding, export-control, duplicate-submission, IP-policy, appeal-ledger, and payout-routing modules. It runs after an award decision exists and before the result is made public.

The guard checks:

- award decision and sponsor approval are present
- payout is authorized or released before public winner publication
- appeal window has closed or has an approved waiver
- IP handoff or open-license terms are satisfied before result publication
- embargo dates have passed
- private/NDA challenge content is redacted before public release
- named team announcements have solver consent
- award splits sum to 100 percent and recipients accepted publication terms
- reproducibility package hashes are present for public claims

## Decisions

- `RELEASE_PUBLICATION`: ready to publish the award and winner metadata.
- `HOLD_FOR_REVIEW`: not ready, but remediable without changing the award.
- `BLOCK_PUBLICATION`: publication would violate a hard trust rule.

## Run

```bash
npm test
npm run demo
```

Demo outputs are written to `artifacts/`:

- `award-publication-results.json`
- `award-publication-report.md`
- `award-publication-summary.svg`
- `award-publication-demo.mp4`

## Boundaries

- synthetic records only
- no payment processor calls
- no private submissions
- no credentials
- no external APIs
- no legal advice

