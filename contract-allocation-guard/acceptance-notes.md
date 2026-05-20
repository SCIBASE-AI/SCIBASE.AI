# Acceptance Notes

## Validation

Run locally from the repository root:

```bash
node contract-allocation-guard/test.js
node contract-allocation-guard/demo.js
node --check contract-allocation-guard/index.js
node --check contract-allocation-guard/test.js
node --check contract-allocation-guard/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 contract-allocation-guard/demo.mp4
git diff --check
```

## Acceptance Criteria Covered

- Ready contract with subscription, compute, and analytics obligations allocates exactly to the contract total.
- Audit digest is deterministic for identical input.
- Rounding residuals are assigned so allocated revenue equals contract consideration.
- Missing standalone selling price evidence blocks revenue allocation.
- Weak SSP support, excessive discounts, and missing delivery evidence produce held status.
- Missing ratable service dates block subscription recognition.
- All calculations use integer cents to avoid floating-point cash posting errors.

## Reviewer Notes

This slice is intentionally narrow. It focuses on bundled contract allocation before revenue recognition and does not overlap with payment collection, FX settlement, partner royalty settlement, plan migration proration, pricing experiments, procurement routing, or SLA/dispute adjustments.
