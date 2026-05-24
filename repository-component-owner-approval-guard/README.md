# Repository Component Owner Approval Guard

Self-contained guard for SCIBASE issue #10. It validates whether merge requests and tagged scientific repository releases have current approval coverage from the required component owners before protected-branch merge.

The guard focuses on component-owner approval quorum, not merge queue execution, repository release generation, provenance attestation, access review, DOI tombstones, sensitive-artifact scanning, dependency licensing, branch hypothesis lineage, or legal holds.

## What It Checks

- Component ownership for `manuscript/`, `data/`, `code/`, `notebooks/`, `protocols/`, `results/`, and `metadata.json`
- Required owner roles per changed component
- Escalation owners for restricted data or protocol changes
- Stale approvals after the latest file change
- Conflicted self-approvals by merge request authors
- Unmapped repository paths without owner policy coverage

## Commands

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Reviewer Artifacts

`npm run demo` generates the structured reviewer packet. `npm run demo:video` verifies the committed video artifacts without rewriting them; use `RECORD_DEMO_VIDEO=1 node demo-video.js` to re-record locally.

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`
- `reports/demo.mp4`

All data is synthetic and local. The module does not call Git providers, repository hosting APIs, identity systems, storage systems, or external services.
