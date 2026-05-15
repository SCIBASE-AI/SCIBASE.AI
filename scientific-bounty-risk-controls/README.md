# Scientific Bounty Risk Controls

Self-contained contribution for SCIBASE issue #18, focused on anti-collusion, duplicate-submission detection, reviewer/sponsor conflict checks, and payout hold decisions for a scientific bounty marketplace.

This module helps a bounty operator answer:

- Are two solver teams submitting the same artifact or near-duplicate method package?
- Are assigned reviewers or arbitrators conflicted with solver teams or the sponsor?
- Do timing and anonymized network signals suggest coordination that should be spot-checked?
- Which submissions are release-ready, which need manual review, and which should be held for arbitration before prize payout or IP handoff?

It is deterministic, dependency-free, credential-free, and uses synthetic sample data only.

## Run

```bash
cd scientific-bounty-risk-controls
npm run check
npm test
npm run demo
```

Demo recording: `docs/bounty-risk-demo.mp4`

## What It Includes

- `src/bounty-risk-controls.js` - duplicate-submission checks, reviewer/sponsor conflict checks, timing/network signals, payout decisions, arbitration queue, and audit digest logic.
- `sample-data.json` - synthetic challenge, solver teams, submissions, artifacts, reviewers, and review assignments.
- `test.js` - Node assertion tests for text similarity, shared artifact hashes, timing/network signals, conflicted reviewers, payout holds, audit digest changes, and validation errors.
- `demo.js` - CLI demo that prints a reviewer-ready risk packet.
- `docs/requirement-map.md` - direct mapping to issue #18 requirements.

## Design Notes

This is intentionally not another broad bounty-system or marketplace mock. It focuses on the trust layer that should run before scientific prize payout:

- Shared artifact hashes produce high-severity duplicate findings.
- Similar methods and deliverable manifests produce manual-review signals.
- Reviewer and arbitrator assignments are checked against institutions, prior collaborations, sponsor employment, and sponsor financial relationships.
- Anonymized network reuse and short submission bursts are treated as review signals, not automatic fraud findings.
- Payout decisions preserve solver fairness by separating `release-ready`, `manual-review`, and `hold-for-arbitration` states.
- The audit digest lets future backend work persist and compare risk packets without storing private raw evidence in public logs.
