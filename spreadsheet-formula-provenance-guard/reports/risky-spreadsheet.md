# Spreadsheet Formula Provenance Guard

Scenario: risky-spreadsheet

Dataset: dataset-fragile-xlsx-002
File: fragile-field-results.xlsm
Decision: HOLD

Reviewed 2 sheets, 2 formula cells, and 1 exports.

## Findings

- HIGH INVALID_SPREADSHEET_DIGEST: fragile-field-results.xlsm does not have a valid SHA-256 upload digest.
- HIGH MACRO_ENABLED_DATASET: fragile-field-results.xlsm is macro-enabled and cannot be treated as inert tabular data.
- HIGH EXTERNAL_WORKBOOK_LINKS: fragile-field-results.xlsm depends on external workbook links: ../lab-shared/master-calibration.xlsx.
- MEDIUM HIDDEN_SHEET_WITH_DATA: hidden-calibration is hidden but contains data or formulas.
- HIGH VOLATILE_FORMULA: hidden-calibration!C7 uses volatile functions: RAND.
- HIGH FORMULA_EXTERNAL_REFERENCE: hidden-calibration!C7 references an external workbook or URL.
- MEDIUM STALE_OR_MISSING_CALCULATION_EVIDENCE: hidden-calibration!C7 lacks cached value or recalculation timestamp evidence.
- MEDIUM FORMULA_WITHOUT_PROVENANCE: hidden-calibration!C7 has no provenance references for its inputs.
- HIGH FORMULA_EXTERNAL_REFERENCE: hidden-calibration!C8 references an external workbook or URL.
- MEDIUM STALE_OR_MISSING_CALCULATION_EVIDENCE: hidden-calibration!C8 lacks cached value or recalculation timestamp evidence.
- MEDIUM FORMULA_WITHOUT_PROVENANCE: hidden-calibration!C8 has no provenance references for its inputs.
- HIGH MISSING_NORMALIZED_EXPORT: Spreadsheet dataset has no CSV or parquet normalized export.
- HIGH INVALID_EXPORT_DIGEST: exports/fragile-field-results.xlsx does not have a valid SHA-256 digest.

## Release Criteria

- Original spreadsheet and normalized exports have stable SHA-256 digests.
- Formula-derived cells avoid volatile functions and external workbook references.
- Formula cells carry cached value, recalculation timestamp, and provenance evidence.
- Hidden sheets, macros, and external links are disclosed or blocked before publication.
- At least one normalized CSV or parquet export is available for reproducible reuse.
