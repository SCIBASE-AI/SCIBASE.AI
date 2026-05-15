# Requirement Map

This module contributes a focused structured-review quality layer for issue #15, "Community & Reputation System."

| Issue area | Covered by this module |
| --- | --- |
| Peer reviews and comments | Scores structured reviews against discipline-neutral rubric criteria: clarity, rigor, novelty, reproducibility |
| Optional scoring quality | Compares reviewer scores against consensus panels and identifies systematic leniency, severity, and inconsistency |
| Review history on profiles | Builds reviewer calibration reports, modes used, review counts, and audit-trail events |
| Contributor credits | Includes CRediT-style reviewer roles and completed bounty / endorsement contribution signals |
| Reputation scoring | Emits transparent trust adjustments, tiers, and quarantine decisions when calibration is weak |
| Incentive tiers | Produces trusted reviewer, calibrated reviewer, coaching-needed, and mentor-required tiers |

## Distinctness

Existing #15 submissions cover broad community reputation ledgers, CRediT graphs, badges, leaderboards, abuse detection, and appeals. This module focuses on the quality gate before peer-review activity increases reputation:

- Does the reviewer score close to consensus?
- Is a reviewer systematically too lenient or too severe?
- Does a reviewer overlook reproducibility?
- Should the review count toward reputation immediately, or enter a coaching queue first?

## Verification

```bash
cd review-calibration-bench
npm run check
npm test
npm run demo
```
