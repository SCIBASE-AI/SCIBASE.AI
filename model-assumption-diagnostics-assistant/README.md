# Model Assumption Diagnostics Assistant

This slice adds a synthetic, dependency-free assistant for the SCIBASE AI-Powered Research Assistant Suite. It reviews analysis packets before an automated peer-review summary is trusted and flags model-assumption failures that can make otherwise polished AI review output misleading.

The assistant focuses on modeling diagnostics that are separate from existing same-issue submissions covering power feasibility, Bayesian prior sensitivity, missing data, causal adjustment, uncertainty calibration, figure-claim consistency, external validity, and sample chain-of-custody.

## What It Checks

- Binary outcomes modeled with an identity-link linear model.
- Low events per predictor.
- Complete or quasi-separation risk.
- Heteroscedasticity without robust uncertainty.
- High multicollinearity.
- Residual skew and influential outliers.
- Residual autocorrelation.
- Too few clusters for clustered claims.
- Missing calibration evidence for binary prediction claims.
- Missing sensitivity models or reviewer-facing diagnostic handoff links.

## Reviewer Output

Running the demo generates:

- `reports/model-assumption-report.json`
- `reports/model-assumption-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.gif`

The generated reviewer packet is synthetic only. It does not call external APIs, run live models, use credentials, or include private research data.

## Commands

```bash
npm test
npm run demo
npm run demo:video
```

`demo:video` renders a small local GIF demo from generated synthetic frames when Pillow is available.
