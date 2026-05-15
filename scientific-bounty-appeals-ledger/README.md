# Scientific Bounty Appeals Ledger

This is a focused Scientific Bounty System module for SCIBASE issue #18. It handles the post-evaluation dispute layer: appeal eligibility, evidence-lock checks, reviewer conflict detection, response SLAs, payout holds, and IP transfer guards.

The slice is intentionally separate from challenge intake, rubric scoring, payout routing engines, and solver workspace privacy. It answers a narrower operational question: after a sponsor or solver contests a result, what must stay locked, who needs to respond, what money can be released, and what IP transfer must wait?

## What It Does

- Validates appeal windows, accepted reason categories, appellant roles, and known submissions.
- Verifies locked evidence snapshots cover contested submission artifacts.
- Flags reviewer conflicts, including sponsor-affiliated reviewers on contested submissions.
- Tracks reviewer response SLAs and escalation state.
- Holds awarded payout amounts while eligible appeals are open.
- Blocks IP transfer while payout is held by an eligible appeal.
- Builds a sponsor feedback packet, arbitration dashboard, audit trail, and stable digest.

## Files

- `src/appeals-ledger.js` - deterministic appeals ledger engine.
- `data/sample-appeals.json` - sample challenge with awards, reviewers, evidence snapshots, and appeals.
- `test/appeals-ledger.test.js` - dependency-free assertions for eligibility, evidence locks, conflicts, payout holds, IP guards, and stable digest behavior.
- `scripts/demo.js` - local CLI demo.
- `docs/requirement-map.md` - mapping to issue #18 requirements.
- `docs/demo.svg` and `docs/demo.mp4` - short visual demo artifacts.

## Run

```bash
npm run check
npm test
npm run demo
```

Expected demo output includes the challenge title, tracked appeal count, payout hold status, held amount, top action, IP guard count, and stable digest.

## Scope Notes

The implementation is dependency-free and credential-free. It models the trust and dispute workflow that sits after challenge evaluation and before payout/IP release, so it can be embedded into a broader bounty marketplace later.
