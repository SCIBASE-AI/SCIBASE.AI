# Dataset Schema Evolution Review

Dataset: `ds-cell-response-042`
Versions: `2026.04` -> `2026.05`
Decision: `hold-for-migration`
Compatibility score: `44`

## Findings

- **warning** renamed_field: donor_group was renamed to cohort; consumers need a migration alias
- **warning** renamed_field: dose_mg was renamed to dose_ug; consumers need a migration alias
- **warning** unit_change: dose_mg unit changed from mg to ug
- **warning** type_change: numeric narrowing may be acceptable if fractional historical values are absent
- **info** added_field: instrument_batch was added to the schema

## Consumer Compatibility

- **preview-table-v2** (preview): review
- **public-api-normalized-response** (api): hold
- **notebook-rerun-dose-response** (rerun): hold

## Reviewer Actions

- Hold automatic publication until affected consumers have migration coverage.
- Disable affected consumers before release: public-api-normalized-response, notebook-rerun-dose-response.
- Add migration aliases for renamed fields before API reuse.
- Record unit conversions in metadata and rerun notebooks that depend on changed units.
