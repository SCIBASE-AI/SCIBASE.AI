# Repository Release Note Claim Guard

This module is a focused Project Repository & Version Control slice for SCIBASE issue #10. It reviews tagged repository release packets before public release notes, citation badges, API exports, or archive bundles are published.

The guard checks that every public release-note claim is backed by:

- a concrete changed repository artifact
- passed evidence of the right kind for the claim type
- path-specific evidence coverage
- fresh evidence within policy
- export-manifest parity for release-note ids and changed artifact digests
- explicit disclosure for breaking changes

It is intentionally separate from broader repository ledgers, semantic version-tag governance, release signatures, merge queues, branch protection, component-owner approvals, external reference pinning, notebook diffs, fork provenance, restore rehearsals, compute sandbox policy, and review-decision provenance. This slice focuses only on whether public release notes overstate, omit, or misrepresent the actual release evidence.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

Generated reviewer artifacts:

- `reports/clean-packet.json`
- `reports/risky-packet.json`
- `reports/release-note-claim-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.mp4`

## Safety

All fixtures are synthetic. The module does not call Git providers, CI systems, DOI registries, object stores, private repositories, payment processors, payout accounts, credential stores, or external APIs.
