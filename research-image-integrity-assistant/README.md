# Research Image Integrity Assistant

Self-contained AI-powered research assistant slice for issue #16. It gives reviewers a deterministic pre-submission image-integrity packet before manuscript figures are released for peer review.

## What It Checks

- Duplicated image panels across manuscript figures using synthetic perceptual hashes.
- Missing raw-image provenance, including absent raw-image IDs and checksum metadata.
- Missing processing histories for crop, contrast, compositing, and adjustment review.
- Scale-bar inconsistencies between declared figure labels and raw pixel-size metadata.

## Outputs

- `reports/image-integrity-packet.json`: structured reviewer decisions and findings.
- `reports/reviewer-report.md`: readable reviewer report for each synthetic scenario.
- `reports/summary.svg`: visual summary of approve, response, and hold decisions.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
node research-image-integrity-assistant/test.js
node research-image-integrity-assistant/demo.js
node --check research-image-integrity-assistant/index.js
node --check research-image-integrity-assistant/test.js
node --check research-image-integrity-assistant/demo.js
```

The module is dependency-free, uses synthetic data only, and makes no network calls.
