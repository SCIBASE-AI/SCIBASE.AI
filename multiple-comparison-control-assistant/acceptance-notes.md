# Acceptance Notes

## Reviewer Path

1. Run `npm run check` to verify syntax.
2. Run `npm test` to verify ready, revise, clean single-endpoint, and deterministic digest behavior.
3. Run `npm run demo` to regenerate reviewer artifacts in `reports/`.
4. Inspect `reports/multiple-comparison-report.md` for manuscript decisions and the review queue.

## Expected Results

- `cardio-biomarker-study` is `peer_review_ready`.
- `neuro-screening-draft` is `revise_before_submission` because confirmatory claims rely on unadjusted p-values without an accepted correction method or endpoint hierarchy.
- `metabolomics-exploration` is `revise_before_submission` because one exploratory claim overstates a finding whose adjusted value exceeds the FDR threshold.

## Demo Artifacts

- `reports/multiple-comparison-packet.json`
- `reports/multiple-comparison-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`
