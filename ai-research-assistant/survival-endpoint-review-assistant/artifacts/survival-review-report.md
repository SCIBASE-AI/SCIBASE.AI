# Synthetic Time-to-Event Manuscript Review Packet

Decision: hold-for-survival-methods-review
Risk score: 25

## Severity Counts

| Severity | Count |
| --- | ---: |
| critical | 2 |
| high | 3 |
| medium | 3 |
| low | 0 |

## Study Summaries

| Study | Events | Events/Variable | Censoring Spread | Min Follow-up Ratio |
| --- | ---: | ---: | ---: | ---: |
| Registry claim: immunotherapy extends overall survival | 66 | 4.13 | 0.183 | 0.69 |
| Prospective device safety follow-up | 22 | 22 | 0 | 1.33 |
| Randomized vaccine durability trial | 183 | 22.88 | 0.014 | 1.64 |

## Findings

### CRITICAL: immortal-time-bias-risk
Study: Registry claim: immunotherapy extends overall survival
Evidence: Exposure begins after baseline with a median start lag of 43 days, but the model treats exposure as baseline-fixed.
Action: Recast exposure as time-dependent or add a justified landmark analysis with sensitivity checks.

### HIGH: proportional-hazards-unsupported
Study: Registry claim: immunotherapy extends overall survival
Evidence: Schoenfeld p=0.018 indicates a proportional-hazards violation, but no time-varying effect model is reported.
Action: Add proportional-hazards diagnostics and use stratified or time-varying coefficients when assumptions fail.

### HIGH: censoring-imbalance
Study: Registry claim: immunotherapy extends overall survival
Evidence: Censoring differs by 18% across arms (immunotherapy: 32%, standard care: 14%).
Action: Report censoring reasons by arm and add inverse-probability or sensitivity analyses.

### MEDIUM: missing-censoring-table
Study: Registry claim: immunotherapy extends overall survival
Evidence: At least one arm has 32% censoring, but no censoring table is included.
Action: Add a table separating administrative censoring, withdrawal, loss to follow-up, and competing events.

### CRITICAL: low-events-per-variable
Study: Registry claim: immunotherapy extends overall survival
Evidence: 66 events across 16 modeled covariates gives 4.1 events per variable.
Action: Reduce model complexity, pre-specify covariates, or provide penalized-regression sensitivity analysis.

### HIGH: competing-risk-model-mismatch
Study: Registry claim: immunotherapy extends overall survival
Evidence: A competing terminal event is present, but the analysis does not use cumulative incidence or cause-specific/subdistribution hazard methods.
Action: Add competing-risk analysis and show whether the treatment conclusion changes.

### MEDIUM: follow-up-shorter-than-event-window
Study: Registry claim: immunotherapy extends overall survival
Evidence: The shortest follow-up-to-event-time ratio is 0.69, so median follow-up may not support the stated survival horizon.
Action: Extend follow-up or soften claims that depend on longer event windows.

### MEDIUM: claim-strength-exceeds-survival-evidence
Study: Registry claim: immunotherapy extends overall survival
Evidence: The manuscript makes directional survival-benefit claims while high-severity survival review holds remain unresolved.
Action: Change the claim to hypothesis-generating language until endpoint and model assumptions are cleared.

## Reproducibility Actions

- Add cumulative-incidence or competing-risk model output alongside Kaplan-Meier estimates.
- Commit a model-specification manifest with event counts, covariate list, and penalization settings.
- Export proportional-hazards diagnostics and time-varying coefficient sensitivity plots.
- Publish arm-level censoring reasons and repeat estimates with censoring sensitivity weights.
- Re-run the model with exposure encoded as time-dependent and compare hazard ratios.

## Research Gap Prompts

- Compare disease areas where informative censoring changes survival conclusions after inverse-probability weighting.
- Find clinical trial families with recurring proportional-hazards violations and summarize accepted alternative estimands.
- Identify endpoints where competing-risk models reverse ordinary Kaplan-Meier interpretations.
- Map studies that treat post-baseline treatment initiation as baseline exposure and estimate the direction of immortal-time bias.
