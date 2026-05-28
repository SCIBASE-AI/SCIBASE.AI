# Causal Adjustment Review

Study: Observational Therapy Mortality Manuscript
Decision: hold-causal-claim
Risk score: 100/100
Evidence digest: 25f8dd674fddef74

## Scope

Variables: 9
Claims: 2
Required confounders: 3
Adjusted covariates: 4
Temporal checks: 2
Negative controls: 1

## Findings

### 1. MISSING_CONFOUNDER_ADJUSTMENT (high)
Required confounder baseline-severity is missing from the primary adjustment set.

Recommendation: Add the omitted baseline confounders to the adjustment set or downgrade causal language.

Evidence:
```json
{
  "variableId": "baseline-severity",
  "label": "Baseline disease severity",
  "role": "confounder",
  "adjustedCovariates": [
    "age",
    "hospitalization",
    "biomarker-response",
    "clinic-preference"
  ]
}
```

### 2. MISSING_CONFOUNDER_ADJUSTMENT (high)
Required confounder comorbidity-index is missing from the primary adjustment set.

Recommendation: Add the omitted baseline confounders to the adjustment set or downgrade causal language.

Evidence:
```json
{
  "variableId": "comorbidity-index",
  "label": "Comorbidity index",
  "role": "confounder",
  "adjustedCovariates": [
    "age",
    "hospitalization",
    "biomarker-response",
    "clinic-preference"
  ]
}
```

### 3. COLLIDER_ADJUSTMENT (high)
Collider hospitalization is included in the primary adjustment set.

Recommendation: Remove collider variables from the primary adjustment set and rerun the sensitivity model.

Evidence:
```json
{
  "variableId": "hospitalization",
  "label": "Hospitalization after treatment decision",
  "colliderReason": "affected by treatment access and early clinical decline"
}
```

### 4. POST_TREATMENT_ADJUSTMENT (high)
Post-treatment variable hospitalization is included in the total-effect adjustment set.

Recommendation: Do not adjust for mediators or post-treatment variables when estimating the total effect.

Evidence:
```json
{
  "variableId": "hospitalization",
  "label": "Hospitalization after treatment decision",
  "role": "collider",
  "measuredAfterExposure": true
}
```

### 5. POST_TREATMENT_ADJUSTMENT (high)
Post-treatment variable biomarker-response is included in the total-effect adjustment set.

Recommendation: Do not adjust for mediators or post-treatment variables when estimating the total effect.

Evidence:
```json
{
  "variableId": "biomarker-response",
  "label": "Early biomarker response",
  "role": "mediator",
  "measuredAfterExposure": true
}
```

### 6. TEMPORAL_ORDER_VIOLATION (high)
Temporal ordering check failed for hospitalization-before-exposure.

Recommendation: Require exposure, confounder, and outcome timestamps that preserve causal ordering.

Evidence:
```json
{
  "checkId": "hospitalization-before-exposure",
  "expected": "all adjusted covariates measured before exposure",
  "observed": "hospitalization is recorded after treatment decision for 38% of rows",
  "affectedClaimIds": [
    "claim-primary-causal"
  ]
}
```

### 7. POSITIVITY_VIOLATION (high)
Propensity overlap is too weak for the stated causal estimand.

Recommendation: Restrict to common-support regions or report the causal estimand as unsupported.

Evidence:
```json
{
  "minPropensity": 0.02,
  "maxPropensity": 0.98,
  "threshold": 0.05
}
```

### 8. WEAK_BALANCE_DIAGNOSTIC (medium)
Covariate baseline-severity remains imbalanced after adjustment.

Recommendation: Improve matching/weighting or add balance caveats for imbalanced covariates.

Evidence:
```json
{
  "variableId": "baseline-severity",
  "standardizedMeanDifference": 0.42,
  "threshold": 0.25
}
```

### 9. WEAK_BALANCE_DIAGNOSTIC (medium)
Covariate comorbidity-index remains imbalanced after adjustment.

Recommendation: Improve matching/weighting or add balance caveats for imbalanced covariates.

Evidence:
```json
{
  "variableId": "comorbidity-index",
  "standardizedMeanDifference": 0.31,
  "threshold": 0.25
}
```

### 10. NEGATIVE_CONTROL_FAILURE (medium)
Negative control negative-control-dental-visit shows a non-null effect.

Recommendation: Investigate residual confounding before presenting the effect as causal.

Evidence:
```json
{
  "controlId": "negative-control-dental-visit",
  "effectEstimate": -0.18,
  "tolerance": 0.05,
  "pValue": 0.012
}
```

### 11. INVALID_INSTRUMENT (medium)
Instrument clinic-preference lacks required validity evidence.

Recommendation: Remove the instrument claim or supply exclusion-restriction and relevance evidence.

Evidence:
```json
{
  "variableId": "clinic-preference",
  "relevanceSupported": true,
  "exclusionRestrictionSupported": false,
  "concern": "clinic preference is associated with severity referral pathways"
}
```

### 12. EFFECT_MODIFIER_UNREPORTED (medium)
Required effect modifier site-region is not reported as a stratum or interaction.

Recommendation: Report stratified estimates or add a limitation for the uncovered effect modifier.

Evidence:
```json
{
  "variableId": "site-region",
  "reason": "treatment access and mortality baseline vary across regions",
  "reportedStrata": []
}
```

### 13. UNSUPPORTED_CAUSAL_LANGUAGE (medium)
Claim claim-primary-causal uses causal language without sufficient design and adjustment evidence.

Recommendation: Replace causal wording with association language until design and adjustment evidence are sufficient.

Evidence:
```json
{
  "claimId": "claim-primary-causal",
  "text": "Early immunotherapy reduced 90-day mortality across the registry cohort.",
  "designType": "observational_cohort",
  "evidenceIds": [
    "table-2",
    "figure-3"
  ]
}
```

### 14. UNSUPPORTED_CAUSAL_LANGUAGE (medium)
Claim claim-mechanism uses causal language without sufficient design and adjustment evidence.

Recommendation: Replace causal wording with association language until design and adjustment evidence are sufficient.

Evidence:
```json
{
  "claimId": "claim-mechanism",
  "text": "The therapy prevents death by rapidly improving inflammatory biomarkers.",
  "designType": "observational_cohort",
  "evidenceIds": [
    "figure-4"
  ]
}
```
