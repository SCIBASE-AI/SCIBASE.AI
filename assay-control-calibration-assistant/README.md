# Assay Control Calibration Assistant

Self-contained AI-powered research assistant slice for issue #16. It gives reviewers a deterministic pre-submission packet for assay control coverage, standard curve readiness, calibration drift, and QC replicate variation.

## What It Checks

- Required positive, negative, blank, vehicle, and no-template control evidence.
- Failed control runs that should block release until repeated or explained.
- Calibration curve fit against manuscript-declared acceptance thresholds.
- Calibration drift above the accepted method or instrument threshold.
- QC replicate coefficient-of-variation issues before reviewer packets are shown.

## Outputs

- `reports/assay-control-calibration-packet.json`: structured reviewer decisions and findings.
- `reports/reviewer-packet.md`: readable reviewer report for each synthetic scenario.
- `reports/summary.svg`: visual summary of approve, response, and hold decisions.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
npm run check
npm test
npm run demo
npm run video
```

The module is dependency-free, uses synthetic data only, and makes no network calls.
