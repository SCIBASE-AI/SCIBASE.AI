# Promotion Dossier Export Guard

This self-contained Community & User Reputation System slice validates synthetic reputation and contribution dossier exports before they are shared with institutions, funders, tenure committees, annual-review offices, or promotion workflows.

The guard is distinct from broad reputation ledgers, CRediT taxonomy validation, contributor attestation, review calibration, workload equity, leaderboard privacy, sybil detection, probation/reinstatement, appeal evidence, and peer-review recertification. It focuses only on institution-facing export packets.

## What it checks

- contributor export consent and opt-out state
- anonymous or double-blind reviewer redaction
- semi-private review export permission
- CRediT contribution evidence links
- badge and reputation evidence freshness
- citation/profile export purpose boundaries
- conflict note redaction
- reviewer-safe remediation before dossier release

## Run locally

```sh
npm test
npm run demo
swift scripts/make-demo-video.swift artifacts/promotion-dossier-demo.mp4
```

The demo writes reviewer artifacts under `artifacts/`:

- `promotion-dossier-results.json`
- `promotion-dossier-report.md`
- `promotion-dossier-summary.svg`
- `promotion-dossier-demo.mp4`
- `demo-transcript.md`

## Boundaries

All packets are synthetic. The module does not call institutional systems, HR systems, private profile stores, live reputation services, credentials, external APIs, or payment systems.
