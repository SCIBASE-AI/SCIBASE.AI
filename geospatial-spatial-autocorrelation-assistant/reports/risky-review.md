# Geospatial Spatial-Autocorrelation Review Assistant

Packet: geo-review-risky-2026-06
Status: HOLD
Fingerprint: e036107e72f70a7e

## Summary

HOLD: 1 manuscript(s) produced 13 finding(s): 2 critical, 8 high, 3 warning, and 2 research gap prompt(s).

## Manuscript Decisions

- urban-heat-random-split: HOLD; reproducibility score 0/100; 13 finding(s)

## Findings

- CRITICAL SPATIAL_SPLIT_LEAKAGE: urban-heat-random-split/rf-heat-risk has train/test samples only 0.6 km apart without spatial blocking.
  - Evidence: Policy requires at least 35 km or explicit spatial block validation.
  - Remediation: Use spatial block, leave-site-out, or regional holdout validation and regenerate performance claims.
- CRITICAL TEST_SET_TUNING: urban-heat-random-split/rf-heat-risk tunes model choices on the test/holdout set.
  - Evidence: Reviewer-facing performance claims require a locked final test set.
  - Remediation: Move tuning to inner validation folds and rerun the locked test set once.
- HIGH DATA_MANIFEST_MISSING: urban-heat-random-split is missing reproducibility artifact dataManifest.
  - Evidence: Geospatial results depend on data, code, and environment parity.
  - Remediation: Attach a data manifest with sample ids, coordinates, split labels, and hashes.
- HIGH ENVIRONMENT_SPEC_MISSING: urban-heat-random-split is missing reproducibility artifact environmentSpec.
  - Evidence: Geospatial results depend on data, code, and environment parity.
  - Remediation: Attach a pinned environment or container digest for spatial libraries.
- HIGH FULL_DATASET_PREPROCESSING_LEAKAGE: urban-heat-random-split/rf-heat-risk fits spatial preprocessing on the full dataset.
  - Evidence: Raster normalization, imputation, or feature selection must be learned inside each training fold.
  - Remediation: Refit preprocessing inside training folds and attach fold-specific transformation hashes.
- HIGH HIGH_SPATIAL_AUTOCORRELATION_RANDOM_SPLIT: urban-heat-random-split/rf-heat-risk reports Moran's I 0.62 with a random split.
  - Evidence: High spatial autocorrelation inflates random train/test validation.
  - Remediation: Run spatial block cross-validation or leave-region-out validation before presenting performance as reviewer-ready.
- HIGH MISSING_CRS_EVIDENCE: urban-heat-random-split does not declare a coordinate reference system.
  - Evidence: Spatial distances, joins, and raster overlays cannot be reviewed without CRS evidence.
  - Remediation: Declare the source CRS/EPSG code and any analysis projection used for distance or area operations.
- HIGH MISSING_EXTERNAL_SPATIAL_VALIDATION: urban-heat-random-split/rf-heat-risk lacks external spatial validation for broader deployment claims.
  - Evidence: Broad geographic or deployment claims should be checked outside the training geography.
  - Remediation: Add an out-of-region validation site or limit the manuscript claim to the sampled geography.
- HIGH OVERBROAD_GEOGRAPHIC_CLAIM: urban-heat-random-split makes a broad geographic claim with only 1 observed region(s).
  - Evidence: The model generalizes across continental urban heat islands.
  - Remediation: Limit the claim to sampled regions or add external validation sites covering the claimed geography.
- HIGH SENSITIVE_COORDINATE_OVERPRECISION: urban-heat-random-split exposes sensitive locations at 6 decimal places.
  - Evidence: Human-subject or protected-species locations should be generalized before reviewer packets or public summaries.
  - Remediation: Round or jitter coordinates to 4 decimals or provide an approved restricted-location access path.
- WARNING COVARIATE_SOURCE_MISSING: urban-heat-random-split/rf-heat-risk covariate NDVI has no source citation or artifact id.
  - Evidence: Raster/vector covariates should be traceable for reproducibility and recency review.
  - Remediation: Attach a source DOI, artifact id, or repository path for each spatial covariate.
- WARNING SPATIAL_BLOCK_MAP_MISSING: urban-heat-random-split has spatial validation claims without a block map artifact.
  - Evidence: Reviewers need the held-out geometry or block map to audit leakage.
  - Remediation: Attach a block-map artifact id, geometry hash, or leave-site-out manifest.
- WARNING STALE_COVARIATE_WINDOW: urban-heat-random-split/rf-heat-risk covariate NDVI spans 540 acquisition days.
  - Evidence: Long covariate windows can hide temporal drift in geospatial models.
  - Remediation: Use period-matched covariates or report temporal-drift sensitivity checks.

## Research Gap Opportunities

- urban-heat-random-split-regional-replication: Prioritize out-of-region replication before broad geographic claims
  - Rationale: urban-heat-random-split samples 1 region(s), below the 3-region policy for broad claims.
  - First action: Recruit or simulate a holdout site in the least represented claimed region.
- urban-heat-random-split-spatial-validation-gap: Add spatial block validation benchmark
  - Rationale: High autocorrelation with random validation means reported accuracy may be optimistic.
  - First action: Create a leave-region-out benchmark and compare it to the random split baseline.
