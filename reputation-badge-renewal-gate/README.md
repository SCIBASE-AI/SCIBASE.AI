# Reputation Badge Renewal Gate

This module adds a deterministic renewal and decay gate for community reputation badges such as `Trusted Reviewer`, `Open Science Champion`, and `Reproducibility Steward`.

It is intentionally dependency-free and uses synthetic sample data only.

## Why it helps

Community reputation should stay transparent and current. A badge earned from old reviews, stale reproducibility evidence, or unresolved appeals can mislead collaborators and institutions. This gate produces an auditable renewal packet that explains whether a badge should renew, downgrade, expire, or enter review.

The gate evaluates:

- evidence freshness windows
- structured peer-review quality
- reproducibility badge recency
- contribution continuity
- appeal or moderation holds
- anonymous-review visibility safety
- required renewal actions

## Files

- `index.js` - renewal gate implementation
- `sample-data.js` - synthetic researcher and badge evidence
- `test.js` - local assertions for renew, review, and expire decisions
- `demo.js` - generates reviewer artifacts in `reports/`

## Usage

```bash
node reputation-badge-renewal-gate/test.js
node reputation-badge-renewal-gate/demo.js
```

The demo writes JSON, Markdown, and SVG packets under:

```text
reputation-badge-renewal-gate/reports/
```

The included `reports/demo.mp4` is a short static walkthrough artifact for bounty review.

## Requirement Coverage

- Peer reviews and comments: evaluates review quality, reviewer history, and anonymous-review safety.
- Contributor credits: checks continuity of recent CRediT-style contribution evidence.
- Reputation scoring: emits transparent badge renewal, downgrade, expiry, and appeal-review decisions.
- Leaderboards and incentive tiers: prevents stale badges from feeding public ranking surfaces without current evidence.
