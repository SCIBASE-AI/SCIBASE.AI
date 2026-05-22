# Manuscript Certainty Tone Assistant

Self-contained AI peer-review aid for SCIBASE issue #13.

The assistant checks whether manuscript wording matches the strength of the linked evidence. It flags overconfident causal language, definitive or universal claims, broad population scope from small samples, unsupported significance wording, missing uncertainty intervals, missing hedging, and missing limitation anchors.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `certainty-tone-packet.json`
- `certainty-tone-report.md`
- `summary.svg`
- `demo.mp4`

## Scope

This slice is intentionally narrow. It is not another broad AI research tool suite, evidence summarizer, citation metadata/context/diversity/style checker, manuscript similarity detector, ethics/data availability audit, unit consistency checker, biomethods provenance assistant, or general statistical consistency module. It focuses on one review question: does the manuscript's certainty and tone fit its evidence?
