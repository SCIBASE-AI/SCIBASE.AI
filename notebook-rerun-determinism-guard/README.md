# Notebook rerun determinism guard

This module checks whether hosted notebooks can receive a reproducibility badge after a rerun.

It focuses on one part of Scientific/Engineering Data & Code Hosting: stable notebook outputs. It does not run containers, call external compute, or access live datasets.

## What it checks

- environment digest
- pinned random seed
- raw data digest
- output digest parity
- numeric drift tolerance
- missing figures
- slow reruns
- provenance bundle presence

## Run it

```bash
node notebook-rerun-determinism-guard/test.js
node notebook-rerun-determinism-guard/demo.js
```

The demo writes JSON and Markdown artifacts to `artifacts/`.
