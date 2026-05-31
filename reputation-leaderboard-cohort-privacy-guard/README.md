# Reputation Leaderboard Cohort Privacy Guard

This module adds a focused cohort privacy guard for the Community & User
Reputation System bounty. It checks whether domain, region, and institution
leaderboards can publish reputation rankings without exposing small-group or
anonymous-review identity signals.

## Scope

The guard evaluates synthetic leaderboard cohorts for:

- minimum cohort size before rank publication
- k-anonymity for region and institution slices
- single-institution dominance inside domain rankings
- sparse badge combinations that make contributors identifiable
- anonymous review credit leakage into public rankings
- contributor opt-out handling
- volatile score deltas that need review before promotion
- deterministic publish, redact, or hold decisions with audit digests

This is not a generic reputation ledger, badge renewal gate, leaderboard
eligibility check, endorsement-ring auditor, reputation abuse guard, credit
attestation ledger, reviewer workload guard, or transparency receipt module. It
focuses specifically on privacy-safe publication of reputation leaderboards.

## Issue #15 Requirement Mapping

- Peer reviews and comments: protects anonymous and semi-private review credits
  before they appear in public reputation rankings.
- Contributor credits: respects contributor opt-out and sparse credit patterns.
- Reputation scoring: publishes transparent rankings only when cohort privacy
  thresholds are met.
- Leaderboards by domain, region, and institution: redacts or holds unsafe
  cohorts while preserving safe aggregate ranking publication.

## Validation

```bash
node reputation-leaderboard-cohort-privacy-guard/test.js
node reputation-leaderboard-cohort-privacy-guard/demo.js
node reputation-leaderboard-cohort-privacy-guard/render-video.js
node --check reputation-leaderboard-cohort-privacy-guard/index.js
node --check reputation-leaderboard-cohort-privacy-guard/sample-data.js
node --check reputation-leaderboard-cohort-privacy-guard/test.js
node --check reputation-leaderboard-cohort-privacy-guard/demo.js
node --check reputation-leaderboard-cohort-privacy-guard/render-video.js
git diff --check
```
