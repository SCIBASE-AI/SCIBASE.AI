# Multiple-Comparison Control Assistant

This module adds a focused AI Peer Review Aid slice for SCIBASE issue #13. It checks whether manuscript result families handle multiple testing before a draft claims statistical significance.

The assistant is intentionally narrower than broad summarizers, citation tools, manuscript similarity checks, unit consistency, reporting-guideline readiness, certainty/tone calibration, and general statistical review. It targets multiplicity risk: uncorrected p-values, missing adjusted values, incompatible FDR claims, unclear hypothesis families, and missing endpoint hierarchy.

## What It Checks

- declared hypothesis family boundaries
- accepted correction methods such as Benjamini-Hochberg, Bonferroni, Holm, or pre-registered hierarchy
- adjusted p-values or q-values for significant tests
- result statements that overclaim based on unadjusted values
- FDR threshold consistency for claimed significant findings
- endpoint hierarchy for confirmatory families
- exploratory labels when exploratory analyses use strong significance language

## Usage

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes deterministic JSON, Markdown, SVG, and MP4 reviewer artifacts to `reports/` when `ffmpeg` is available.

## Safety

All sample manuscripts are synthetic. The module does not process private manuscripts, call external APIs, open network connections, or include credentials.
