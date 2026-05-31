# Reputation Leaderboard Cohort Privacy Report

Generated: 2026-05-31T00:00:00.000Z
Audit digest: 9b5f103aef0c21f36be638441092c61d467485681d272c3b02b80f66038f9e1f

## Summary

- Cohorts: 5
- Publish: 1
- Redact: 1
- Hold: 3
- Blockers: 7
- Warnings: 1
- Max privacy risk score: 89

## Decisions

### leaderboard:bioinformatics-global

- Type: domain
- Label: Bioinformatics global reputation
- Decision: publish
- Contributors: 48
- Institution count: 4
- Largest institution share: 0.38
- Privacy risk score: 0
- Blockers: none
- Warnings: none
- Actions: publish leaderboard cohort
- Digest: 81bb07b74f811e668edfb85c8329e8aac2bd26f526692d74fe64385ff9a4f7a8

### leaderboard:rare-disease-region

- Type: region
- Label: Rare disease research in small region
- Decision: hold
- Contributors: 6
- Institution count: 2
- Largest institution share: 0.67
- Privacy risk score: 89
- Blockers: cohort has 6 contributors, below 10 minimum; institution diversity 2 is below 3; largest institution share 0.67 exceeds 0.65; 2 sparse badge combinations can identify contributors
- Warnings: none
- Actions: hold public leaderboard until cohort has enough contributors; aggregate with a broader cohort before publication; redact institution-specific rank signals; collapse rare badge combinations into aggregate labels
- Digest: 095c589444d10b9e44cb8bc333f894c3646c4387645b4dfbccfec7ddd0e89bf2

### leaderboard:institution-anonymous-review

- Type: institution
- Label: Institution peer review reputation
- Decision: hold
- Contributors: 18
- Institution count: 1
- Largest institution share: 1
- Privacy risk score: 28
- Blockers: 1 sparse badge combinations can identify contributors; anonymous review credit share 0.5 is too high for public ranking
- Warnings: none
- Actions: collapse rare badge combinations into aggregate labels; publish anonymous review credit as aggregate only
- Digest: ab5fd8da2bc43bb5d615a273fc2602a3b5b4e2bd7720357f3461a482a4f709a3

### leaderboard:open-science-optout

- Type: domain
- Label: Open science champion ranking
- Decision: hold
- Contributors: 26
- Institution count: 4
- Largest institution share: 0.31
- Privacy risk score: 25
- Blockers: 2 contributors opted out of leaderboard display
- Warnings: none
- Actions: remove opted-out contributors before release
- Digest: be9eff7033f9a6889acbf8ce998c6cd8b3334cd1a4b5b3e9fa300b3b6204754f

### leaderboard:quantum-score-spike

- Type: domain
- Label: Quantum methods score spike
- Decision: redact
- Contributors: 22
- Institution count: 4
- Largest institution share: 0.32
- Privacy risk score: 15
- Blockers: none
- Warnings: max score delta 18.5 needs moderation review
- Actions: queue score spike for moderator review; publish after moderation review
- Digest: 7ffc7a270f005a4a14da48d843a530b610960d2ec496385777fb9cf228928d40
