# Peer Review Citation Coercion Guard

This module adds a focused Community & User Reputation slice for SCIBASE issue #15. It evaluates structured peer reviews before they update reviewer reputation, badges, leaderboards, or project timelines when citation pressure is present.

The guard detects unsupported reviewer self-citation demands, reciprocal citation pressure, journal or editor citation quotas, and clusters of off-topic mandatory citation requests. It also protects authors from reputation or badge penalties while a steward reviews the citation pressure.

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

- `reports/citation-coercion-packet.json`
- `reports/citation-coercion-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not use credentials, private users, live review systems, payment systems, or external APIs.
