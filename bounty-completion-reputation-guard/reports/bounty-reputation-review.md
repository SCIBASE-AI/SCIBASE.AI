# Scientific Bounty Completion Reputation Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Completions reviewed: 5
- Final credits: 1
- Provisional credits: 1
- Blocked credits: 3
- Total reputation delta: 109

## Requirement Map

- Reputation scoring: converts accepted bounty outcomes into transparent reputation deltas.
- Scientific bounty completions and challenge performance: gates points on acceptance, difficulty, result, settlement, and appeals.
- Contributor credits: allocates credit by team share and blocks invalid or duplicate split attribution.
- Badges and leaderboards: blocks final badge and leaderboard impact when reputation evidence is provisional or unsafe.
- Project timelines and citation pages: requires immutable deliverable, evaluation, settlement, and public-summary receipts.

## Findings

### Ada Ng - Single-cell biomarker discovery

- Decision: award-final-credit
- Result: winner
- Difficulty: expert
- Base points: 87
- Reputation delta: 87

Actions:
- Post final bounty-completion reputation credit and update badge/leaderboard eligibility.

### Bram Ortiz - Materials optimization challenge

- Decision: provisional-credit
- Result: winner
- Difficulty: advanced
- Base points: 86
- Reputation delta: 22
- high: settlement-not-paid - Awarded bounty completion is not fully settled.
- high: ip-release-not-final - IP or public release state is not final for this completion.
- high: missing-settlement-receipt - Completion lacks settlement receipt evidence.

Actions:
- Hold or mark reputation as provisional until prize settlement is paid.
- Keep citation-page and public badge credit provisional until IP/release state is final.
- Attach payment or settlement receipt before final reputation posting.

### Chandra Kaur - Climate forecast benchmark

- Decision: block-reputation-credit
- Result: honorable-mention
- Difficulty: expert
- Base points: 22
- Reputation delta: 0
- high: missing-arbitration-digest - Accepted or awarded completion lacks arbitration or evaluation digest.
- critical: settlement-not-paid - Awarded bounty completion is not fully settled.
- critical: appeal-open - Completion has an open appeal or arbitration hold.
- high: ip-release-not-final - IP or public release state is not final for this completion.
- high: missing-settlement-receipt - Completion lacks settlement receipt evidence.

Actions:
- Attach evaluation digest so challenge-performance reputation is explainable.
- Hold or mark reputation as provisional until prize settlement is paid.
- Freeze reputation deltas, badges, and leaderboard impact until appeal closes.
- Keep citation-page and public badge credit provisional until IP/release state is final.
- Attach payment or settlement receipt before final reputation posting.

### Dina Silva - Quantum noise-reduction prototype

- Decision: block-reputation-credit
- Result: milestone
- Difficulty: standard
- Base points: 45
- Reputation delta: 0
- high: missing-team-split-ledger - Team completion lacks split-attribution evidence.
- critical: invalid-team-share - Team share is outside the valid 1-100 percent range.
- critical: duplicate-completion-credit - Completion appears to have already contributed reputation credit.

Actions:
- Attach team split ledger before distributing reputation deltas.
- Correct contributor share before updating profiles, badges, or leaderboards.
- Block duplicate reputation credit and preserve one canonical completion receipt.

### Eli Rossi - Protein folding scoring challenge

- Decision: block-reputation-credit
- Result: submitted
- Difficulty: advanced
- Base points: 5
- Reputation delta: 0
- critical: missing-sponsor-acceptance - Bounty completion lacks sponsor acceptance evidence.

Actions:
- Do not award completion reputation until sponsor acceptance is recorded.
