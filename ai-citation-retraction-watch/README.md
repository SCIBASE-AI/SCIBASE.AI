# AI Citation Retraction Watch

This module adds a self-contained safety slice for AI-assisted research tools. It checks candidate citations and manuscript-backed claims against synthetic retraction, correction, and expression-of-concern signals before the citation tool recommends insertions.

## What it does

- Scores citation candidates for each manuscript claim using relevance, evidence level, recency, and safety status.
- Blocks retracted or expression-of-concern citations from automatic insertion.
- Allows corrected papers only with a required erratum note.
- Produces reviewer-ready replacement actions and citation insertion plans.
- Emits deterministic watch events with SHA-256 digests for audit trails.
- Provides dependency-free tests and a terminal demo using synthetic data only.

## Local usage

```bash
npm run check
npm test
npm run demo
```

## Files

- `src/citation-retraction-watch.js`: core evaluator and helpers.
- `sample-data.json`: synthetic claims, citation catalog, and retraction signals.
- `test.js`: Node assertion coverage.
- `demo.js`: reviewer-friendly terminal demo.
- `docs/requirement-map.md`: maps the module to the AI-Assisted Research Tools bounty.
- `docs/demo.svg` and `docs/demo.mp4`: short demo artifacts.
