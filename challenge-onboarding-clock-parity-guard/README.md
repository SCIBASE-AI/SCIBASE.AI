# Challenge Onboarding Clock Parity Guard

Self-contained reviewer artifact for SCIBASE issue #18, focused on fair workspace onboarding before a scientific bounty submission clock starts.

This slice is intentionally narrow. It is not another challenge intake, data-room access, prequalification, escrow, scoring, payout, appeal, regulatory, or debrief module. It answers one operational fairness question: are all accepted teams equally ready before the clock begins?

## What It Checks

- Every accepted team has a ready workspace timestamp before the proposed clock start.
- The submission clock starts after the last team is ready, with a published buffer.
- Starter workspace template versions and starter-kit checksums match the canonical onboarding plan.
- Required tools are available to every accepted team.
- Compute and storage quotas meet the published baseline.
- Support channels are visible to every team before clock start.
- Setup blockers do not wait for first support response until after the clock begins.
- Extra privileged tools are approved or normalized across teams.

## Local Verification

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

`npm run demo` writes reviewer artifacts to `reports/`:

- `clean-audit.json`
- `risky-audit.json`
- `risky-review.md`
- `summary.svg`
- `manifest.json`
- `demo.mp4`

## Requirement Mapping

- Scientific bounty system: protects challenge fairness after accepted teams are chosen and before submission windows open.
- Solver workspace operations: validates starter templates, starter kits, tools, quotas, and support access.
- Equal opportunity: delays the submission clock until every accepted team has equivalent working access.
- Auditability: emits deterministic JSON, Markdown, SVG, and MP4 artifacts from synthetic local data.
- Scope hygiene: avoids credentials, external services, payment systems, private challenge data, or real participant information.
