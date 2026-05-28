# Lay Summary Safety Gate

This slice supports issue #13, AI-Assisted Research Tools. It reviews
layperson explanations generated from scientific manuscripts before they are
shown to collaborators, funders, or public readers.

The gate uses synthetic summary packets only. It does not call external models,
read private manuscripts, or store personal data.

## Checks

- Lay summaries must not introduce unsupported causal or clinical benefit
  language.
- Statistical uncertainty from the source must remain visible in the summary.
- Required technical terms must either be explained or removed.
- Population and study scope must not be broadened beyond the source.
- Clean summaries produce deterministic reviewer receipts.

## Local Verification

```bash
node ai-assisted-research-tools/lay-summary-safety-gate/test.js
node ai-assisted-research-tools/lay-summary-safety-gate/demo.js
git diff --check
```

The demo writes deterministic artifacts under
`ai-assisted-research-tools/lay-summary-safety-gate/artifacts/`.

## Files

- `gate.js` - summary safety checks and receipt generation.
- `data/summary-packets.json` - synthetic manuscript and lay summary packets.
- `test.js` - Node built-in tests.
- `demo.js` - deterministic JSON, Markdown, and SVG artifact generation.
