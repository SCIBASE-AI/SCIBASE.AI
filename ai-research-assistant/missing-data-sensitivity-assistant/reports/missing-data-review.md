# Missing Data Sensitivity Review: Digital biomarker therapy trial with incomplete twelve-week outcomes

Decision: hold-review
Risk score: 100
Audit digest: 4971fd0e71fc4738

## Attrition
- Control: 8.3%
- Intervention: 28.8%

## Findings
- [high] Attrition is high or imbalanced across arms: Arm attrition ranges from 8.3% to 28.8%; spread is 20.5%.
  Action: Add a CONSORT-style attrition table, explain arm-specific loss, and run an attrition sensitivity analysis.
- [high] Primary outcome missingness lacks a prespecified handling plan: week12-functional-score has 44 missing values (18.5% of randomized participants).
  Action: Specify the missing-data estimand, assumptions, imputation model, and sensitivity analyses before reviewer-ready claims are generated.
- [high] Confirmatory analysis relies on weak imputation: Configured imputation method is "single mean imputation".
  Action: Use multiple imputation or a justified likelihood-based model, report diagnostics, and compare complete-case, imputed, and MNAR scenarios.
- [high] Outcome-related missingness has no MNAR sensitivity analysis: week12-functional-score: intervention dropouts had worse week-four scores and more adverse-event discontinuations
  Action: Add delta-adjusted, tipping-point, pattern-mixture, or selection-model sensitivity scenarios and calibrate claim strength to the worst credible scenario.
- [high] Complete-case and imputed estimates materially disagree: Complete-case estimate 0.42; imputed estimate 0.21; relative shift 100%.
  Action: Report both estimates, explain the assumed missingness mechanism, and avoid definitive language until sensitivity estimates are reconciled.
- [high] Worst credible missing-data scenario undercuts the main claim: delta-adjusted scenario reduces the effect to 0.05 and crosses the null threshold
  Action: Downgrade the conclusion, disclose the sensitivity result, and mark the finding as exploratory or unresolved.
- [medium] Dropout reasons are not reviewer-ready: 24 of 44 dropout reasons are unknown or not reported.
  Action: Resolve or group dropout reasons and identify whether missingness is plausibly independent of outcome.
- [medium] Claim wording is stronger than the missing-data evidence supports: Claim "The intervention conclusively improves twelve-week functional recovery." relies on complete-case-only evidence while primary outcome missingness is 18.5%.
  Action: Calibrate language to conditional complete-case evidence or require imputed and MNAR sensitivity support.

## Safety
- Synthetic data only; no external services or private project data.
