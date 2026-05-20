# Acceptance Notes

## Scope

Adds checks repository metadata completeness before public scientific release for issue #10.

## Non-overlap

This slice avoids repository ledger, merge queue, restore rehearsal, DOI tombstone, access review, environment drift, notebook replay, release embargo, structured diff, or API export slices.

## Validation

```bash
node repository-metadata-release-readiness-gate/test.js
node repository-metadata-release-readiness-gate/demo.js
file repository-metadata-release-readiness-gate/reports/demo.webm repository-metadata-release-readiness-gate/reports/summary.svg
git diff --check
```

Expected result:

- Tests print `repository-metadata-release-readiness-gate tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough.
