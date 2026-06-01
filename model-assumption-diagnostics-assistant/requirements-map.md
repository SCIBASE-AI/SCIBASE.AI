# Requirements Map

Issue #16 asks for an AI-powered research assistant suite that can detect methodology red flags, check claims against evidence, and provide useful review suggestions before public release.

This contribution covers a distinct review capability: model-assumption diagnostics before an AI peer-review report is trusted.

| Issue capability | Implementation |
| --- | --- |
| Methodological red flags | `reviewModelAssumptions()` flags model-family mismatch, low events per predictor, separation, heteroscedasticity, multicollinearity, outliers, autocorrelation, cluster fragility, and missing calibration. |
| Claims vs. evidence alignment | The assistant compares reviewer claims and remediation evidence against actual diagnostics. |
| Internal team review output | `buildReviewerMarkdown()` emits a reviewer-facing packet with evidence and remediation. |
| Reproducible synthetic demo | `demo.js` creates deterministic JSON, Markdown, SVG, and demo script artifacts from `sample-data.js`. |
| No private data or credentials | All inputs are synthetic and local; there are no network calls, secrets, patient records, payment data, or external services. |

## Non-Overlap

This is not:

- A study-power or sample-size feasibility assistant.
- A missing-data sensitivity assistant.
- A causal adjustment or DAG review assistant.
- A Bayesian prior sensitivity assistant.
- An uncertainty calibration assistant.
- A figure or citation claim consistency assistant.
- A sample chain-of-custody assistant.

The slice is specifically about whether the primary statistical or ML model can support the manuscript claims under its declared assumptions.
