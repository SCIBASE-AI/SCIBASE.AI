# Export-Control Data Transfer Guard

This module adds an export-control and restricted-data transfer readiness guard for the Scientific Bounty System in issue #18.

The slice focuses on a gap that appears before a global scientific challenge is published: whether the sponsor can safely open challenge materials, data rooms, participation, and prize payouts across jurisdictions.

## Why This Matters

Scientific bounty challenges can involve dual-use research, controlled biological material, genomic data, clinical trial data, geolocation data, or cross-border teams. A platform should not release these materials simply because a challenge has a prize and rubric. It needs a deterministic hold/revise/release check before:

- public challenge publication,
- private data-room access,
- solver workspace provisioning,
- reviewer access,
- payout release,
- IP handoff after payment.

## Implemented Scope

- Detects sensitive challenge topics such as dual-use, controlled biological agent, encryption research, satellite imagery, advanced semiconductor, and autonomous weapons.
- Detects high-risk data types such as human-subject data, genomic data, clinical trial data, geolocation precision, and critical infrastructure data.
- Blocks restricted participant jurisdictions until legal review clears eligibility.
- Requires export classification for sensitive topics.
- Requires a data-use agreement for restricted data.
- Requires auditable cross-border data-room access logs.
- Requires an NDA workflow when a challenge says an NDA is needed.
- Requires payout sanctions or payout-eligibility screening before reward release.
- Generates a deterministic reviewer transfer manifest.

## Decision Model

- `hold`: at least one blocker exists, so publication or data-room access should not open.
- `revise`: no blockers, but missing audit controls should be remediated before launch.
- `release`: no blockers or warnings.

## Local Validation

```bash
npm test
npm run demo
```

## Files

- `src/index.js`: no-dependency evaluator and manifest builder.
- `test/index.test.js`: node:test coverage for hold, revise, release, and manifest generation.
- `scripts/demo.js`: emits blocked and releasable sample manifests.
- `reports/export-control-transfer-report.md`: reviewer-facing summary.
- `reports/export-control-transfer-manifest.json`: deterministic sample manifest output.

## Out of Scope

- Live legal advice.
- Payment processing.
- Wallets, Stripe, tax systems, or sanctions APIs.
- Private challenge data, participant PII, or credentials.
- Automated publication to external portals.

