# Collaborative Equation Anchor Guard Report

Generated: 2026-05-31T06:52:02.718Z

## Summary

- Sessions checked: 3
- Allow export: 1
- Allow with notice: 0
- Hold export: 2
- Equations: 5
- References: 5

## Decisions

### manuscript-ready - allow_export

- Title: Bayesian calibration of synthetic assay controls
- Equations: 2
- References: 2
- Audit digest: 7fe66eb5302522bd554a7f676d6163fd836cc7dcc5b6daf0df0165cb3076ee46
- Evidence: reference eq:posterior resolves; reference eq:loss resolves; eq:posterior should render as (2.1); eq:loss should render as (2.2)
- Blockers: none
- Warnings: none
- Actions: allow manuscript export with equation anchors preserved

### duplicate-labels - hold_export

- Title: Collaborative model appendix
- Equations: 2
- References: 2
- Audit digest: 77f4938a7e13350bf9d83b77e6f7b65d28f617999109dcbfa5e6dd202aa7d5ee
- Evidence: reference eq:model-score resolves; eq:model-score should render as (3.1); eq:model-score should render as (3.2)
- Blockers: duplicate equation label eq:model-score appears 2 times; section results references missing eq:missing-threshold
- Warnings: none
- Actions: rename duplicate equation labels before export; repair stale equation references before export

### locked-private-leak - hold_export

- Title: Submission-ready manuscript draft
- Equations: 1
- References: 1
- Audit digest: a4d9ddbe01aad7cc4570f0ab643db47615071322275fbd7ff881518f6110eccf
- Evidence: reference eq:final-estimator resolves; eq:final-estimator should render as (4.1)
- Blockers: private reviewer comment c-private-equation-note remains on eq:final-estimator; locked section final-figures equation eq:final-estimator was modified by external-reviewer
- Warnings: none
- Actions: resolve or redact private reviewer equation comments; obtain section-owner approval for locked equation changes

