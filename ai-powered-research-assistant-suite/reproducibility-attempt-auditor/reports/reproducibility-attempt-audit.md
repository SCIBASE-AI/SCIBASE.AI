# Reproducibility Attempt Audit

Project: CRISPR Single-Cell Survival Pipeline
Decision: hold-public-release
Confidence score: 0/100
Latest attempt: attempt-2026-05-27
Evidence digest: 56b751379ec55c9a

## Scope

Datasets: 4
Environments: 1
Pipeline stages: 3
Attempts: 3
Prior attempts: 2
Reported results: 2

## Findings

### 1. MISSING_RAW_DATA (high)
Required raw dataset cohort-linkage is not available to the reproducibility runner.

Recommendation: Require persistent raw dataset access before computing a public reproducibility confidence score.

Evidence:
```json
{
  "datasetId": "cohort-linkage",
  "access": "restricted",
  "reason": "reviewer link expired before the latest run"
}
```

### 2. DATASET_DIGEST_MISMATCH (high)
Dataset clean-analysis-table digest does not match the declared project manifest.

Recommendation: Block publication until the stored dataset digest matches the digest used by the reproduced run.

Evidence:
```json
{
  "datasetId": "clean-analysis-table",
  "expectedDigest": "sha256:clean-table-v2",
  "observedDigest": "sha256:clean-table-v1"
}
```

### 3. MISSING_TEST_SET (medium)
Reviewer test set reviewer-test-set is missing or unavailable.

Recommendation: Attach the reviewer test set or mark the result as not independently reproducible.

Evidence:
```json
{
  "testSetId": "reviewer-test-set",
  "present": true,
  "available": false
}
```

### 4. DEPENDENCY_LOCK_DRIFT (high)
Latest attempt attempt-2026-05-27 used a different dependency lock digest than the project manifest.

Recommendation: Rebuild the environment from the declared lock digest or refresh the project manifest.

Evidence:
```json
{
  "attemptId": "attempt-2026-05-27",
  "declaredLockDigest": "sha256:renv-lock-2026-05-20",
  "actualLockDigest": "sha256:renv-lock-2026-05-27"
}
```

### 5. UNPINNED_DEPENDENCY (medium)
Dependency randomForestSRC is not pinned in environment renv-r-survival-2026.

Recommendation: Pin dependency versions before enabling one-click reproduction.

Evidence:
```json
{
  "environmentId": "renv-r-survival-2026",
  "dependency": "randomForestSRC",
  "version": "latest"
}
```

### 6. OUTPUT_ARTIFACT_DIGEST_MISMATCH (high)
Artifact clean-analysis-table digest differs from the expected reproducible output.

Recommendation: Regenerate the artifact or correct the expected digest before marking the run reproducible.

Evidence:
```json
{
  "artifactId": "clean-analysis-table",
  "expectedDigest": "sha256:clean-table-v2",
  "producedDigest": "sha256:clean-table-v1"
}
```

### 7. OUTPUT_ARTIFACT_DIGEST_MISMATCH (high)
Artifact figure-2a digest differs from the expected reproducible output.

Recommendation: Regenerate the artifact or correct the expected digest before marking the run reproducible.

Evidence:
```json
{
  "artifactId": "figure-2a",
  "expectedDigest": "sha256:figure-2a-v3",
  "producedDigest": "sha256:figure-2a-v2"
}
```

### 8. RESULT_MISMATCH (high)
Reported result primary-hazard-ratio differs from the reproduced value beyond tolerance.

Recommendation: Reconcile reported manuscript values with reproduced outputs before assistant endorsement.

Evidence:
```json
{
  "resultId": "primary-hazard-ratio",
  "label": "Primary hazard ratio",
  "expected": 0.74,
  "actual": 0.81,
  "tolerance": 0.02,
  "delta": 0.07
}
```

### 9. RESULT_MISMATCH (high)
Reported result concordance-index differs from the reproduced value beyond tolerance.

Recommendation: Reconcile reported manuscript values with reproduced outputs before assistant endorsement.

Evidence:
```json
{
  "resultId": "concordance-index",
  "label": "C-index",
  "expected": 0.81,
  "actual": 0.76,
  "tolerance": 0.015,
  "delta": 0.05
}
```

### 10. MISSING_RANDOM_SEED (medium)
Latest attempt attempt-2026-05-27 did not record a random seed for a stochastic pipeline.

Recommendation: Record random seeds for stochastic analysis stages and rerun the pipeline.

Evidence:
```json
{
  "attemptId": "attempt-2026-05-27",
  "seed": null
}
```

### 11. RUN_VARIANCE_EXCEEDS_TOLERANCE (high)
Repeated runs for primary-hazard-ratio vary beyond the configured reproducibility tolerance.

Recommendation: Investigate non-determinism, seed handling, and unstable dependencies before approving the result.

Evidence:
```json
{
  "resultId": "primary-hazard-ratio",
  "tolerance": 0.03,
  "min": 0.69,
  "max": 0.81,
  "spread": 0.12,
  "attempts": [
    {
      "attemptId": "attempt-2026-05-23",
      "value": 0.74
    },
    {
      "attemptId": "attempt-2026-05-24",
      "value": 0.69
    },
    {
      "attemptId": "attempt-2026-05-27",
      "value": 0.81
    }
  ]
}
```

### 12. RUN_VARIANCE_EXCEEDS_TOLERANCE (high)
Repeated runs for concordance-index vary beyond the configured reproducibility tolerance.

Recommendation: Investigate non-determinism, seed handling, and unstable dependencies before approving the result.

Evidence:
```json
{
  "resultId": "concordance-index",
  "tolerance": 0.02,
  "min": 0.76,
  "max": 0.83,
  "spread": 0.07,
  "attempts": [
    {
      "attemptId": "attempt-2026-05-23",
      "value": 0.81
    },
    {
      "attemptId": "attempt-2026-05-24",
      "value": 0.83
    },
    {
      "attemptId": "attempt-2026-05-27",
      "value": 0.76
    }
  ]
}
```

### 13. PRIOR_REPRO_FAILURE (medium)
Prior reproducibility attempt external-reviewer-2026-05-18 failed without a linked remediation.

Recommendation: Link the failed prior attempt to a resolved remediation before raising confidence.

Evidence:
```json
{
  "attemptId": "external-reviewer-2026-05-18",
  "reviewer": "journal-reviewer-2",
  "reason": "cohort-linkage reviewer URL returned 403 and model figure digest did not match"
}
```
