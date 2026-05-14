# Community Reputation Safeguards

This self-contained module implements a focused trust layer for SCIBASE issue #15. It is not a full social network; it is the reputation and privacy guardrail engine that a larger community system can call after reviews, comments, contributions, endorsements, and verification events.

The module is deterministic, dependency-free, and credential-free.

## What It Covers

- Structured peer reviews with public, semi-private, anonymous, and double-blind display modes.
- Inline comments anchored to documents, datasets, code blocks, and notebooks with reviewer identity redaction.
- Timestamped CRediT-style contribution attribution and project contributor graphs.
- Transparent reputation scoring from review quality, citations, forks, endorsements, reproducibility badges, bounty completions, and challenge performance.
- Abuse-resistant penalties for self-endorsements, reciprocal endorsement loops, conflicts of interest, and low-evidence reviews.
- Badges and incentive tiers such as `Trusted Reviewer`, `Open Science Champion`, and `Reputation Watch`.
- Leaderboards by domain, region, and institution.

## Local Verification

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
Top contributor: Dr. Lina Ortiz
Top badge: Open Science Champion
Abuse signals: 4
```

## Files

- `src/reputation-safeguards.js` - trust and reputation engine.
- `data/sample-community.json` - sample reviews, comments, contributions, endorsements, and metrics.
- `scripts/demo.js` - CLI demo for reviewers.
- `test/reputation-safeguards.test.js` - regression coverage with Node's built-in test runner.
- `docs/requirement-map.md` - issue #15 requirement mapping.
- `docs/demo.svg` and `docs/demo.mp4` - short demo artifacts for PR review.
