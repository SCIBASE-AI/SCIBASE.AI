# Supplement Readiness Report

Status: hold
Readiness score: 88
Audit digest: 7818896003d6e0a8f0c1e816ed885d21144523f54239bc61bbca7388ed64fbb8

## Manuscript

Title: Adaptive single-cell perturbation screens reveal durable stress programs
Domain: computational biology
Package: supp-v3-review 3.0-review

## Coverage

- Claims ready: 1/3
- Artifacts passing: 0/6
- Missing required artifact kinds: none

## Claim Review

| Claim | Status | Linked artifacts | Blockers |
| --- | --- | --- | --- |
| claim-main-effect | block | dataset-counts, code-analysis, notebook-main | rerun_prerequisites_incomplete |
| claim-protocol | pass | protocol-stimulation | - |
| claim-appendix | block | supplement-table-s4, notebook-main | rerun_prerequisites_incomplete |

## Artifact Review

| Artifact | Kind | Status | Blockers | Warnings |
| --- | --- | --- | --- | --- |
| dataset-counts | dataset | block | checksum_mismatch | stale_checksum |
| code-analysis | code | block | missing_license | - |
| notebook-main | notebook | block | notebook_not_rerunnable | - |
| protocol-stimulation | protocol | warn | - | protocol_version_missing |
| supplement-table-s4 | table | block | missing_path, missing_checksum | - |
| raw-screening-notes | dataset | block | human_data_not_deidentified | orphan_artifact |

## Blockers

- claim-main-effect_rerun_prerequisites_incomplete
- claim-appendix_rerun_prerequisites_incomplete
- dataset-counts_checksum_mismatch
- code-analysis_missing_license
- notebook-main_notebook_not_rerunnable
- supplement-table-s4_missing_path
- supplement-table-s4_missing_checksum
- raw-screening-notes_human_data_not_deidentified

## Reviewer Actions

- claim-main-effect_connect_dataset_code_and_rerunnable_notebook
- claim-appendix_connect_dataset_code_and_rerunnable_notebook
- claim-appendix_link_figure_or_table_appendix_support
- dataset-counts_regenerate_or_correct_checksum
- dataset-counts_refresh_checksum
- code-analysis_add_license_metadata
- notebook-main_provide_rerun_environment
- protocol-stimulation_add_protocol_version
- supplement-table-s4_add_artifact_path
- supplement-table-s4_add_checksum
- raw-screening-notes_redact_or_restrict_human_data
- raw-screening-notes_link_artifact_to_claim
