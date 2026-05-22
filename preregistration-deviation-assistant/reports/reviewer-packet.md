# Preregistration Deviation Assistant

Issue: SCIBASE.AI #16 AI-Powered Research Assistant Suite
Scope: compare manuscript claims against a preregistration or registered report before AI peer review presents findings as confirmatory.

## Manuscript Decisions

### MS-HOLD-771
Registration: OSF-HOLD-771
Status: HOLD
Required decision: hold_confirmatory_review
Audit digest: `MS-HOLD-771:OSF-HOLD-771:hold:B=ANALYSIS_MODEL_DEVIATION|MULTIPLE_TESTING_CORRECTION_MISSING|POST_HOC_EXCLUSION_CRITERIA|PRIMARY_OUTCOME_SWITCH|REGISTERED_EXCLUSION_CRITERIA_OMITTED|RETROSPECTIVE_REGISTRATION|SECONDARY_OUTCOME_PROMOTED|UNREGISTERED_SUBGROUP_CONFIRMATORY_CLAIM:W=EXPLORATORY_LABELING_INCOMPLETE|POST_UNBLINDING_AMENDMENT|SAMPLE_SIZE_DEVIATION|UNREGISTERED_COVARIATES_ADDED`

Blockers:
- PRIMARY_OUTCOME_SWITCH: Primary outcome mismatch. Missing: replication-success-rate. Added: reviewer-confidence, benchmark-score-gain.
- SECONDARY_OUTCOME_PROMOTED: Secondary outcome promoted to primary without amendment: reviewer-confidence.
- ANALYSIS_MODEL_DEVIATION: Analysis model changed from logistic regression to random forest classifier.
- MULTIPLE_TESTING_CORRECTION_MISSING: Registered plan requires multiple-testing correction but manuscript disables it.
- REGISTERED_EXCLUSION_CRITERIA_OMITTED: Registered exclusion criteria are missing from the manuscript: missing-raw-data.
- POST_HOC_EXCLUSION_CRITERIA: Manuscript adds exclusion criteria without amendment: low-citation-count.
- UNREGISTERED_SUBGROUP_CONFIRMATORY_CLAIM: Unregistered subgroups are presented as confirmatory: single-cell-papers.
- RETROSPECTIVE_REGISTRATION: Registration timestamp is after data collection started.

Warnings:
- UNREGISTERED_COVARIATES_ADDED: Manuscript adds unregistered covariates: journal-impact.
- SAMPLE_SIZE_DEVIATION: Analyzed sample size 198 differs from target 300 by more than 10%.
- EXPLORATORY_LABELING_INCOMPLETE: Exploratory findings are present but labeling is incomplete.
- POST_UNBLINDING_AMENDMENT: Amendment AMD-LATE-1 occurred after unblinding.

Remediation actions:
- Explain the primary-outcome change and downgrade unregistered outcomes to exploratory if not prospectively amended.
- Restore the registered outcome hierarchy or cite a prospective amendment.
- Restore the preregistered analysis model or label the changed analysis as exploratory.
- Mark added covariates as sensitivity analyses or cite a prospective amendment.
- Apply the registered multiple-testing correction or explain the deviation.
- Explain recruitment stopping, attrition, or sample-size amendment.
- Report every registered exclusion criterion and participant count impact.
- Remove post-hoc exclusions from confirmatory analysis or label them exploratory.
- Move unregistered subgroup findings to exploratory language.
- Add explicit exploratory labels to non-preregistered findings.
- Disclose retrospective registration and avoid confirmatory preregistration claims.
- Explain whether post-unblinding amendments affect confirmatory claims.

### MS-REVIEW-118
Registration: OSF-REVIEW-118
Status: REVIEW
Required decision: deviation_review
Audit digest: `MS-REVIEW-118:OSF-REVIEW-118:review:B=none:W=EXPLORATORY_LABELING_INCOMPLETE|REGISTERED_SECONDARY_OUTCOME_OMITTED|UNREGISTERED_SUBGROUPS_DISCLOSED`

Blockers:
- None.

Warnings:
- REGISTERED_SECONDARY_OUTCOME_OMITTED: Registered secondary outcomes are omitted: missed-limitation-count.
- UNREGISTERED_SUBGROUPS_DISCLOSED: Unregistered subgroups need clear exploratory labeling: phase-iii-trials.
- EXPLORATORY_LABELING_INCOMPLETE: Exploratory findings are present but labeling is incomplete.

Remediation actions:
- Report omitted secondary outcomes or explain why they are not analyzed.
- Add explicit exploratory labels to non-preregistered findings.

### MS-READY-042
Registration: OSF-READY-042
Status: READY
Required decision: release_ai_review
Audit digest: `MS-READY-042:OSF-READY-042:ready:B=none:W=none`

Blockers:
- None.

Warnings:
- None.

Remediation actions:
- None.

## Notes
This demo uses synthetic data only. It performs no model calls, registry lookups, or external network requests.
