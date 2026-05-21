# Study Power Feasibility Assistant

This module adds a focused statistical power review slice for SCIBASE issue
[#16](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/16). It helps the AI
Research Assistant Suite detect manuscript claims that overstate what the study
design can support.

The contribution is intentionally narrow. It does not duplicate prompt-safety,
supplement readiness, rebuttal generation, uncertainty calibration, grant-fit,
citation-context, benchmark leakage, figure-claim, or analysis-variable
assistants already submitted for the same broad issue.

## What It Checks

- Required sample size per group for continuous and binary outcomes.
- Actual sample size coverage against target alpha and power.
- Expected effect size versus the minimum detectable effect.
- Multiple-comparison load when no analysis plan is declared.
- Missing preregistration, missing outcome declaration, or missing analysis plan.
- Reviewer actions for revise/hold decisions.

## Local Usage

```bash
cd study-power-feasibility-assistant
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts under `reports/`:

- `study-power-review-packet.json`
- `study-power-review-report.md`
- `summary.svg`
- `demo.mp4`

All examples use synthetic study metadata. No external services, API keys,
accounts, or private research records are required.
