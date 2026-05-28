# Collaborative Notebook Reproducibility Guard

This module adds a dependency-free pre-acceptance guard for embedded Jupyter-style outputs in the real-time collaborative research editor.

It checks whether notebook outputs are reproducible enough to be accepted into a shared manuscript section. The guard reviews execution order, kernel/runtime fingerprints, dependency lock hashes, random seed capture, input artifact fingerprints, stale output timestamps, unsafe rich HTML, private local paths, and section-version drift.

## Commands

```bash
npm test
npm run demo
npm run video
npm run check
```

## Outputs

The demo writes deterministic artifacts to `reports/`:

- `unsafe-notebook-packet.json`
- `warning-notebook-packet.json`
- `clean-notebook-packet.json`
- `notebook-reproducibility-report.md`
- `maintainer-verification-packet.md`
- `summary.svg`
- `demo.mp4`

## Status Lanes

- `hold_notebook_outputs`: block shared manuscript insertion and require a clean rerun.
- `stage_for_reproducibility_review`: allow review only after metadata is completed.
- `accept_notebook_outputs`: output packet is ready for collaborative acceptance.
