# Notebook Output Diff Gate

This slice supports issue #10, Project Repository & Version Control. It adds a
deterministic gate for notebook diffs so repository reviewers can tell whether
changed outputs are backed by changed inputs, execution evidence, and stable
output fingerprints.

The module uses synthetic notebook diff packets only. It does not execute user
code, connect to kernels, read credentials, or inspect private notebooks.

## Checks

- Output changes without code or input changes are blocked as stale output risk.
- Code changes require a matching execution record.
- Execution environment changes require the diff to include an environment
  fingerprint.
- Large output changes require reviewer evidence such as a figure checksum,
  table digest, or run log.
- Clean notebook diffs produce a reviewer-ready receipt.

## Local Verification

```bash
node project-repository-version-control/notebook-output-diff-gate/test.js
node project-repository-version-control/notebook-output-diff-gate/demo.js
git diff --check
```

The demo writes deterministic artifacts under
`project-repository-version-control/notebook-output-diff-gate/artifacts/`.

## Files

- `gate.js` - notebook diff risk checks and receipt generation.
- `data/notebook-diffs.json` - synthetic repository notebook diff packets.
- `test.js` - Node built-in tests.
- `demo.js` - deterministic JSON, Markdown, and SVG artifact generation.
