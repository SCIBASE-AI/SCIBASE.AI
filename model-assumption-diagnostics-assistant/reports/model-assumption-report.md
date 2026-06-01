# Model Assumption Diagnostics: SCI-MODEL-ASSUMPTION-001

Decision: **hold-ai-review**
Risk score: **100/100**

Findings: 4 blockers, 7 warnings.

## BLOCK: LOW_EVENTS_PER_PREDICTOR
The event-per-predictor ratio is too low for stable adjusted effects.

Evidence: `{"eventCount":18,"predictors":14,"eventsPerPredictor":1.29}`

Remediation: Reduce predictors, use penalization, or present the model as exploratory until stability is demonstrated.

## BLOCK: MODEL_FAMILY_OUTCOME_MISMATCH
Binary outcomes should not be released through an identity-link linear model without an explicit sensitivity justification.

Evidence: `{"outcomeType":"binary","family":"linear-regression","linkFunction":"identity"}`

Remediation: Refit with a logistic or mixed-effects logistic model, or add a documented sensitivity analysis before AI review conclusions are trusted.

## BLOCK: REVIEW_PACKET_INCOMPLETE
The reviewer handoff is missing sensitivity evidence or links to diagnostics.

Evidence: `{"sensitivityModelIncluded":false,"reviewerPacketLinksDiagnostics":false}`

Remediation: Hold automated peer-review approval until the handoff packet includes diagnostics and sensitivity results.

## BLOCK: SEPARATION_RISK
Separation indicators suggest coefficient estimates may be unstable or infinite.

Evidence: `{"completeSeparationIndicators":2}`

Remediation: Use penalized logistic regression or exact methods and report the separation diagnostic in the reviewer packet.

## WARN: AUTOCORRELATION_RISK
Residual autocorrelation may invalidate nominal uncertainty estimates.

Evidence: `{"durbinWatson":1.12}`

Remediation: Model temporal or batch correlation explicitly, or use clustered uncertainty estimates.

## WARN: CALIBRATION_MISSING
Binary prediction claims need calibration evidence before reviewer summaries treat them as reliable.

Evidence: `{"calibrationReported":false}`

Remediation: Add calibration curve, Brier score, or held-out calibration summary.

## WARN: HETEROSCEDASTICITY_UNHANDLED
Residual variance is not constant and no robust standard errors were declared.

Evidence: `{"breuschPaganPValue":0.004}`

Remediation: Report robust or clustered standard errors and flag affected inference in the limitations section.

## WARN: MULTICOLLINEARITY_HIGH
Predictors show high variance inflation, so independent-effect claims may be overstated.

Evidence: `{"maxVarianceInflationFactor":12.6}`

Remediation: Collapse correlated predictors, use regularization, or downgrade independent-effect language.

## WARN: OVERCONFIDENT_ASSUMPTION_CLAIM
The manuscript claims diagnostics were considered but does not disclose assumption risk in limitations.

Evidence: `{"limitationTextMentionsAssumptionRisk":false}`

Remediation: Add limitation language that names the specific modeling assumptions still under review.

## WARN: RESIDUAL_OUTLIER_PRESSURE
Residual skew or influential outliers are large enough to require sensitivity reporting.

Evidence: `{"residualSkew":1.8,"outlierStudentizedResidualMax":4.9}`

Remediation: Add influence diagnostics, robust fit sensitivity, and a reviewer-facing note describing impacted claims.

## WARN: TOO_FEW_CLUSTERS
Cluster-adjusted claims are fragile with very few clusters.

Evidence: `{"clusterCount":3,"smallestClusterSize":6}`

Remediation: Report cluster limitations and avoid generalizing beyond the observed sites or batches.
