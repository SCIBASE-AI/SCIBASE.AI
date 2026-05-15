# Review Calibration Bench

Dependency-free peer-review calibration and coaching signals for the Community & Reputation System bounty.

This module focuses on the quality gate before peer-review activity increases a researcher's public reputation. It compares structured review rubric scores against consensus panels, identifies leniency/severity drift, flags reproducibility blind spots, and emits transparent trust-adjustment and coaching actions.

## Run

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Program: community-review-q2-2026
Status: coaching-needed
Reviewers calibrated: 3
Coaching actions: 7
Quarantined reviewers: 1
Top reviewer: ada (trusted-reviewer)
Top action: Review practice set: rigor scores are higher than consensus.
```

## Files

- `src/review-calibration.js` builds calibration reports, leaderboard scores, coaching actions, trust adjustments, dashboard summary, audit trail, and stable digest.
- `data/sample-calibration.json` contains synthetic structured reviews, consensus panels, reviewer modes, and contributor signals.
- `test/review-calibration.test.js` verifies calibration scores, drift classification, blind-spot detection, quarantine behavior, leaderboard ordering, and digest stability.
- `docs/requirement-map.md` maps this slice to issue #15.
- `docs/demo.svg` and `docs/demo.mp4` provide a short visual artifact for review.

No real private review content, identity secret, or external service credential is used.
