# Research Quality Gate

This is a self-contained milestone for the AI-powered research assistant suite in SCIBASE issue #16. It focuses on a pre-submission quality gate: a deterministic assistant pass that decides whether a project is ready to release, needs revision, or should be held.

The module does not call external AI services or require credentials. It uses transparent scoring rules so reviewers can reproduce every recommendation locally.

## What It Covers

- Auto peer-review risk checks for clarity, scope, claims, methods, limitations, and citation support.
- Claim, evidence, citation, and statistical alignment with severity-ranked findings.
- Reproducibility confidence based on runnable commands, raw data, checksums, lockfiles, seeds, tests, and prior attempts.
- Research-gap ranking from a local corpus using unresolved questions, negative results, replication gaps, interests, and lab capabilities.
- Reviewer-calibration cards that convert the highest-risk findings into training prompts for assisted reviewers.
- A single readiness decision with next actions.

## Local Verification

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
Decision: hold
Readiness score: 67
Top action: Add direct evidence for claim c2.
```

## Files

- `src/quality-gate.js` - deterministic quality-gate engine.
- `data/sample-project.json` - sample scientific project, evidence, reproducibility metadata, and corpus.
- `scripts/demo.js` - CLI demo for reviewers.
- `test/quality-gate.test.js` - regression coverage with Node's built-in test runner.
- `docs/requirement-map.md` - issue #16 requirement mapping.
- `docs/demo.svg` and `docs/demo.mp4` - short demo artifacts for PR review.

## Integration Notes

The exported `buildQualityGate(project)` function is pure and has no side effects. A future backend can call it after a manuscript upload, notebook run, or internal review event and persist the returned report as a review artifact.
