# Scientific Bounty Workspace Privacy

This self-contained module implements the solver-side privacy and prequalification layer for SCIBASE issue #18. It focuses on secure bounty submission workspaces: anonymous team participation, NDA and eligibility checks, classified artifacts, access decisions, IP-safe release states, and audit-ready package manifests.

The module is deterministic, dependency-free, credential-free, and safe to run locally.

## What It Covers

- Challenge prequalification gates for domain fit, institution eligibility, conflict disclosures, and NDA readiness.
- Anonymous or named solver-team workspaces with role-based access decisions.
- Artifact classification, required-deliverable coverage, SHA-256 integrity checks, and redacted sponsor previews.
- Sponsor, reviewer, arbitrator, and solver access decisions that respect phase deadlines and dispute states.
- IP-safe release states: metadata-only review before payout, controlled release after accepted award, and blocked release when payment is incomplete.
- Standardized submission package manifests with artifact hashes, deliverable status, access summary, and deterministic package digest.
- Workspace audit events suitable for arbitration and sponsor review.

## Local Verification

```bash
npm run check
npm test
npm run demo
```

Expected demo shape:

```text
Challenge: Single-cell biomarker sprint
Workspace status: hold
Prequalification: eligible=1, hold=1
Package digest: 64 hex chars
Sponsor confidential artifact access: denied
Arbitrator confidential artifact access: allowed
```

## Files

- `src/workspace-privacy.js` - privacy gate, prequalification, access-control, manifest, and audit digest engine.
- `data/sample-workspaces.json` - sample bounty challenge and solver workspaces.
- `test/workspace-privacy.test.js` - Node test coverage for privacy blockers, package redaction, access decisions, prequalification, and digest determinism.
- `scripts/demo.js` - CLI demo for reviewers.
- `docs/requirement-map.md` - issue #18 requirement mapping.
- `docs/demo.svg` and `docs/demo.mp4` - visual demo artifacts for PR review.
