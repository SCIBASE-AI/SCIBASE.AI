# Spreadsheet Formula Provenance Guard

Scenario: clean-spreadsheet

Dataset: dataset-climate-yield-001
File: climate-yield-model.xlsx
Decision: RELEASE

Reviewed 2 sheets, 1 formula cells, and 2 exports.

## Findings

- No spreadsheet provenance findings.

## Release Criteria

- Original spreadsheet and normalized exports have stable SHA-256 digests.
- Formula-derived cells avoid volatile functions and external workbook references.
- Formula cells carry cached value, recalculation timestamp, and provenance evidence.
- Hidden sheets, macros, and external links are disclosed or blocked before publication.
- At least one normalized CSV or parquet export is available for reproducible reuse.
