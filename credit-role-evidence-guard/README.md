# Credit Role Evidence Consistency Guard

This module adds a focused guard for the Community & User Reputation System bounty.
It validates whether CRediT-style contribution claims have enough artifact evidence
before those claims are shown on profiles, citation pages, leaderboards, or
institutional exports.

The guard is intentionally dependency-free and uses synthetic data only. It does
not call external services, inspect private projects, or contain credentials.

## What It Checks

- Unsupported or misspelled CRediT role names
- Contributor consent before profile-visible credit is published
- Missing artifact evidence for a claimed role
- Evidence type mismatches, such as Software credit with only manuscript evidence
- Anonymous or blind-review evidence that would leak identity if made public
- Peer-review credit on a project where the reviewer is also an author
- Duplicate role/evidence claims that could inflate reputation scores
- Stale evidence that should be refreshed before reputation deltas are applied

## Usage

```bash
node credit-role-evidence-guard/test.js
node credit-role-evidence-guard/demo.js
```

The demo writes reviewer artifacts to `credit-role-evidence-guard/reports/`.
