# Notebook rerun determinism report

## NB-100: RNA velocity notebook
Decision: PUBLISH_REPRODUCIBLE
Next step: publish the rerun badge and output manifest

## NB-210: Climate downscaling notebook
Decision: REVIEW_BEFORE_RELEASE
Next step: ask a reviewer to approve the reproducibility packet
Warnings:
- rerun is slower than expected
- provenance bundle is missing

## NB-404: Tumor segmentation notebook
Decision: HOLD_RELEASE
Next step: hold the notebook until the rerun packet matches the baseline
Blockers:
- missing environment digest
- random seed is not pinned
- output digest changed from baseline
- numeric drift exceeds allowed tolerance
- expected figures are missing
