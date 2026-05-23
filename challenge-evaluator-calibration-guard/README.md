# Challenge Evaluator Calibration Guard

Self-contained guard for SCIBASE Scientific Bounty System issue #18. The module checks whether synthetic seed submissions and evaluator calibration scores are ready before a challenge opens live sponsor/reviewer scoring.

## Scope

- Verifies that every rubric criterion has enough synthetic seed coverage.
- Requires passing, borderline, and failing seed outcome buckets.
- Excludes sponsor, solver, observer, inactive, unknown, and conflicted evaluator scores.
- Detects evaluator severity drift against expected seed scores.
- Detects criterion-level drift and excessive inter-rater spread.
- Checks low, target, and high normalization anchors for every rubric criterion.
- Produces deterministic JSON, Markdown, SVG, and MP4 review artifacts.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`.

## Integration Shape

`evaluateChallengeEvaluatorCalibration()` accepts synthetic challenge packets with:

- `rubricCriteria`
- `seedSubmissions`
- `evaluators`
- `calibrationScores`
- `normalizationAnchors`

It returns challenge statuses:

- `live_scoring_ready`
- `recalibrate_before_live_scoring`
- `hold_live_scoring`

The output also includes a review queue, ready queue, recalibration queue, and SHA-256 audit digest.
