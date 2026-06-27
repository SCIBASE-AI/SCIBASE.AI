# Survey Psychometric Validity Assistant

Self-contained SCIBASE issue #16 slice for AI-assisted peer review of survey manuscripts. The assistant blocks or escalates AI review output when a submitted survey scale has psychometric validity gaps that would make the downstream review misleading.

The module uses synthetic packets only and has no network calls, external AI APIs, private manuscripts, credentials, or live data.

## What it checks

- reverse-coded item handling drift
- low Cronbach alpha or missing internal-consistency evidence
- factor-loading cross-loads and weak primary loadings
- confirmatory factor analysis sample-size shortfall
- missing or inconsistent Likert anchors
- construct-claim mismatch between manuscript claims and validated scales
- release readiness for AI-generated peer-review output

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

Demo outputs are written to `reports/`.
