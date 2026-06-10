# Column Sensitivity Release Gate

Self-contained guard for SCIBASE issue #14. The module validates hosted dataset columns before public previews, API access, or export bundles are enabled.

## Scope

- Checks direct identifier columns for accepted release transforms.
- Checks quasi-identifier columns against k-anonymity evidence.
- Requires free-text redaction review evidence.
- Ensures location columns are coarsened to the allowed precision.
- Requires data-steward approval for sensitive columns in public release lanes.
- Flags excessive sensitive-column counts before public release.
- Blocks malformed dataset or column evidence before reviewer packets are generated.
- Produces release/hold queues and deterministic JSON, Markdown, SVG, and MP4 review artifacts.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`.

## Integration Shape

`evaluateColumnSensitivityRelease()` accepts dataset packets with:

- `releaseModes`
- `releaseEvidence`
- `columns`
- `stewardApprovals`

It returns dataset statuses:

- `release_ready`
- `release_review`
- `release_blocked`

The output also includes a release queue, hold queue, review queue, column summaries, and SHA-256 audit digest.
