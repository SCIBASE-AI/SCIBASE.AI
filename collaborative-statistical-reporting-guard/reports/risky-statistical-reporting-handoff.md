# Collaborative Statistical Reporting Handoff

Decision: hold_collaborative_export
Analyses reviewed: 3
Held analyses: 2
Audit digest: sha256:6043784e7d3140a56405bd2bc05ea1cb61c66dac75ea83ca824907f266668a62

## Priority Findings

| Severity | Code | Remediation |
| --- | --- | --- |
| critical | LOCKED_SECTION_STAT_EDIT_UNAPPROVED | approve_or_revert_locked_section_statistical_edit |
| critical | SAMPLE_SIZE_DRIFT | reconcile_sample_size_text_table_and_figure |
| high | BLOCKING_STAT_REVIEW_COMMENT_OPEN | resolve_blocking_statistical_review_comment |
| high | BLOCKING_STAT_REVIEW_COMMENT_OPEN | resolve_blocking_statistical_review_comment |
| high | CONFIDENCE_INTERVAL_MISMATCH | reconcile_confidence_interval_text_and_table |
| high | CONFIDENCE_INTERVAL_MISMATCH | reconcile_confidence_interval_text_and_table |
| high | EFFECT_SIZE_MISMATCH | reconcile_effect_size_text_and_table |
| high | P_VALUE_TABLE_MISMATCH | sync_text_and_table_p_values |
| high | P_VALUE_WORDING_CONTRADICTION | align_p_value_threshold_wording |
| high | P_VALUE_WORDING_CONTRADICTION | align_p_value_threshold_wording |
| high | SAMPLE_SIZE_SOURCE_MISSING | add_text_table_or_figure_sample_size_evidence |
| medium | CI_SIGNIFICANCE_WORDING_CONFLICT | review_ci_and_statistical_significance_wording |

## Analysis Actions

| Analysis | Status | Actions |
| --- | --- | --- |
| analysis-survival-primary | hold_collaborative_export | reconcile_sample_size_text_table_and_figure, align_p_value_threshold_wording, sync_text_and_table_p_values, reconcile_effect_size_text_and_table, reconcile_confidence_interval_text_and_table, sync_figure_statistic_with_text_and_table, approve_or_revert_locked_section_statistical_edit, resolve_blocking_statistical_review_comment |
| analysis-biomarker-subgroup | needs_statistical_review | add_text_table_or_figure_sample_size_evidence, align_p_value_threshold_wording, add_effect_size_to_text_and_table, review_ci_and_statistical_significance_wording, attach_figure_statistic_value_and_anchor |
| analysis-exploratory-dose | hold_collaborative_export | attach_structured_p_value_or_mark_descriptive_only, reconcile_confidence_interval_text_and_table, resolve_blocking_statistical_review_comment |

