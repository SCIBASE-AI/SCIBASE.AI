# Acceptance Notes

This slice is intentionally narrow so it does not duplicate the existing FAIR manifest, artifact package integrity, preview cache, raw instrument preview, notebook preview, retention/tombstone, model-card lineage, license compatibility, sensitive-redaction, schema-evolution, data dictionary, provenance, access-gate, quota, or executable-environment drift submissions.

## Reviewer Value

- Catches public DOI reuse before release.
- Blocks public release when resolver evidence points at the wrong landing page.
- Requires DataCite metadata before DOI-backed artifact release.
- Keeps restricted artifacts behind landing-page access controls instead of direct downloads.
- Requires tombstone continuity for withdrawn or superseded artifacts.

## Local Verification

Expected commands:

```bash
npm run check
npm test
npm run demo
```

The generated reports can be reviewed without external services.
