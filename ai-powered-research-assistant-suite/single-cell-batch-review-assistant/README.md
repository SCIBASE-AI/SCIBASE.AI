# Single-Cell Batch Review Assistant

This module is a focused AI-Powered Research Assistant Suite slice for issue #16. It reviews single-cell or spatial-omics manuscript packets for batch-effect, donor-replication, annotation, integration, quality-control, and differential-expression risks before an AI peer-review report endorses biological claims.

It checks:

- condition, site, chemistry, or sequencing batches confounded with biological groups
- cell-level pseudoreplication when donor-level pseudobulk is required
- unresolved doublet or multiplet rates
- cell-type labels with weak marker support
- integration overcorrection risks in downstream differential expression
- missing mitochondrial, ribosomal, UMI, and cell-count QC thresholds
- uncorrected ambient RNA contamination
- cluster instability across resolution or bootstrap checks
- strong differential-expression claims without donor-replicated evidence
- missing raw matrix, pipeline version, random seed, and parameter digest evidence

All fixtures are synthetic. The module does not use credentials, private genomic data, patient records, external APIs, model providers, or live analysis engines.

## Run

```sh
node ai-powered-research-assistant-suite/single-cell-batch-review-assistant/test.js
node ai-powered-research-assistant-suite/single-cell-batch-review-assistant/demo.js
node ai-powered-research-assistant-suite/single-cell-batch-review-assistant/make-demo-video.js
```

The demo writes reviewer artifacts to `reports/`:

- `single-cell-batch-review.json`
- `single-cell-batch-review.md`
- `single-cell-batch-summary.svg`
- `demo.mp4`

## Bounty Fit

Issue #16 asks for AI peer-review reports that detect methodological red flags, claim/evidence alignment problems, and reproducibility risks across domains. This slice adds a deterministic single-cell review layer that can hold, revise, or approve cell-state claims before the assistant presents reviewer-ready feedback.
