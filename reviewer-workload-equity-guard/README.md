# Reviewer Workload Equity Guard

Self-contained Community & User Reputation System slice for
`SCIBASE-AI/SCIBASE.AI#15`.

The guard evaluates pending peer-review assignments before they affect profile
reputation, badges, leaderboards, or project timelines. It checks reviewer
capacity, weekly review hours, opt-outs, leave windows, rest periods, expertise
match, early-career penalty risk, and recent review-credit concentration. It
also fails closed on duplicate evidence identifiers, malformed temporal
evidence, reversed availability windows, and future-dated assignment history so
bad chronology cannot silently distort workload or concentration scoring.

This is intentionally separate from broad reputation ledgers, endorsement rings,
leaderboard eligibility, review civility, review timeliness scoring, recusal/COI,
calibration benches, edit-history integrity, identity-leak checks, appeals,
mentorship, correction-impact, credit attestation, profile visibility, and
template-rubric validation. Its job is to stop unfair negative reputation deltas
when the reviewer was overloaded, unavailable, or mismatched before scoring.

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Outputs

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`

All data is synthetic. The module does not call identity services, profile
systems, leaderboards, email systems, review assignment systems, or external
APIs.
