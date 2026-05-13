# Scientific Bounty Trust System

Self-contained implementation milestone for [SCIBASE.AI issue #18](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/18).

The module models a scientific bounty marketplace with explicit trust controls:

- challenge posting contracts with deliverables, scoring rubrics, phases, prize schedule, and NDA/public settings
- submission package manifests with checksums, artifact metadata, audit log, and disclosure level
- arbitration workflow with automated checklist, reviewer votes, sponsor feedback, and decision state
- escrow-style payout routing for winner, milestone, honorable mention, team, and institutional payouts
- IP terms that prevent unpaid transfer: solver-retains, sponsored transfer upon payout, or open submission
- small dependency-free API/demo for reviewers

## Run

```bash
cd scientific-bounty-trust-system
npm run check
npm test
npm start
```

Open `http://localhost:4318` or inspect:

```bash
curl -s http://localhost:4318/api/challenge
curl -s http://localhost:4318/api/submission
curl -s http://localhost:4318/api/arbitration
curl -s http://localhost:4318/api/payouts
```

## Why This Shape

The issue asks for a marketplace that connects real R&D challenges with scientific talent. The riskiest part of that workflow is trust: sponsors need evidence that deliverables are real, and solvers need proof that work is not transferred before payment. This milestone makes those invariants explicit and locally testable.

## Files

- `src/bounty-system.js` - challenge, submission, arbitration, payout, and IP engines.
- `src/sample-data.js` - representative biotech challenge and solver submission.
- `src/server.js` - local JSON API and reviewer dashboard.
- `test/bounty-system.test.js` - Node test coverage for core marketplace workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
