# Project Contribution Credit Gate

Self-contained review slice for issue #11, User & Project Management.

This module validates contribution credit packets before a scientific project is published. It focuses on authorship consent, CRediT role coverage, and artifact contributor omissions rather than broad RBAC, invitation expiry, service-account governance, break-glass access, deletion/erasure, or funding attribution.

## What it checks

- Listed contributors have explicitly consented to the credit statement.
- Credited contributors have at least one CRediT taxonomy role.
- Contributors who touched manuscript, code, data, or result artifacts are credited or routed for review.
- Deterministic reviewer actions are emitted for publication blockers.

## Files

- `index.js` - contribution credit evaluator and report builder.
- `sample-data.js` - synthetic project/contributor scenarios.
- `test.js` - Node.js built-in test suite.
- `demo.js` - generates reviewer artifacts in `reports/`.
- `reports/credit-packet.json` - generated machine-readable decisions.
- `reports/credit-report.md` - generated reviewer packet.
- `reports/summary.svg` - generated visual summary.
- `reports/demo.mp4` - short demo video artifact for bounty review.

## Run

```bash
node project-contribution-credit-gate/test.js
node project-contribution-credit-gate/demo.js
```

## Safety

The sample data is synthetic. The module performs no network calls, touches no live identity providers, and contains no secrets, tokens, private dashboard data, payout information, ORCID credentials, SAML/OAuth data, or private project records.
