# Community Reputation Ledger

Self-contained implementation milestone for [SCIBASE.AI issue #15](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/15).

It models the community and reputation layer for a scientific collaboration network:

- discipline-specific peer-review templates
- public, semi-private, blind, and double-blind review modes
- inline comments anchored to documents, datasets, code, and notebooks
- timestamped contributor credits using CRediT roles
- project timeline events and contributor graph payloads
- transparent reputation scoring from citations, forks, endorsements, review quality, reproducibility, and bounty completions
- badges and domain/institution leaderboards
- dependency-free JSON API/demo server

## Run

```bash
cd community-reputation-ledger
npm run check
npm test
npm start
```

Open `http://localhost:4324` or inspect:

```bash
curl -s http://localhost:4324/api/reviews
curl -s http://localhost:4324/api/comments
curl -s http://localhost:4324/api/contributions
curl -s http://localhost:4324/api/reputation
curl -s http://localhost:4324/api/leaderboard
curl -s http://localhost:4324/api/timeline
```

## Implementation Notes

The current module is deterministic so maintainers can inspect the rules. Production integrations can later swap storage, identity, moderation, and notification layers without changing review, credit, scoring, or leaderboard payloads.

## Files

- `src/reputation.js` - review, comment, contribution, reputation, badge, leaderboard, and timeline logic.
- `src/sample-data.js` - representative project community data.
- `src/server.js` - local API and reviewer dashboard.
- `test/reputation.test.js` - Node tests for core community workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
