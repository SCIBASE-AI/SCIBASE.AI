# Deliverable Acceptance Window Guard

This focused slice adds holds scientific bounty deliverables that miss acceptance-window or evidence requirements for issue #18.

## What it does

- Evaluates structured sample inputs with deterministic controls.
- Emits ready and held queues for reviewer workflow.
- Produces JSON, Markdown, SVG, and demo video artifacts.
- Keeps the implementation dependency-free and runnable with Node.

## Run it

```bash
node deliverable-acceptance-window-guard/test.js
node deliverable-acceptance-window-guard/demo.js
```

Generated outputs are written to `deliverable-acceptance-window-guard/reports/`.

## Why this is distinct

This does not duplicate bounty payout eligibility, amendment control, challenge evidence freeze, rubric readiness, milestone progress, leaderboard integrity, prequalification, sponsor reliability, or IP redaction slices. It focuses specifically on holds scientific bounty deliverables that miss acceptance-window or evidence requirements.
