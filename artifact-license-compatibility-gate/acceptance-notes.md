# Acceptance Notes

## Scope

Adds a focused artifact license compatibility gate for issue #14.

## Non-overlap

This slice focuses on license compatibility and release blocking, not:

- FAIR manifest/access gates
- package integrity
- preview cache
- raw instrument previews
- notebook previews
- retention/tombstone ledgers
- environment drift
- provenance-chain validation
- quarantine/rerun workflows
- quotas
- model-weight lineage

## Validation

Run:

```bash
node artifact-license-compatibility-gate/test.js
node artifact-license-compatibility-gate/demo.js
```

Expected result:

- Tests print `artifact license compatibility tests passed`.
- Demo writes JSON, Markdown, and SVG reports.
- `reports/demo.webm` provides a short visual walkthrough of the release status.
