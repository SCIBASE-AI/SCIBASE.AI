# Geospatial Spatial-Autocorrelation Review Assistant

Self-contained reviewer utility for SCIBASE issue #16, AI-Powered Research Assistant Suite. It reviews synthetic geospatial manuscript packets before AI peer-review, reproducibility, or research-gap recommendations are released to researchers.

## What It Checks

- Coordinate reference system and analysis projection evidence.
- Invalid or over-precise coordinates for sensitive human-subject or protected-location studies.
- Spatial train/test leakage from nearby train and holdout samples.
- High Moran's I paired with random validation splits.
- Preprocessing fitted on the full dataset for spatial covariates.
- Test-set tuning, missing external spatial validation, stale covariate windows, and missing raster/vector source metadata.
- Reproducibility artifacts: data manifest, code commit, environment spec, and spatial block map.
- Research-gap prompts for under-sampled regions and missing spatial validation benchmarks.

## Why This Is Distinct

Existing #16 work covers broad assistant orchestration, evidence binding, structured abstracts, randomization/blinding, survival analysis, missing-data sensitivity, causal adjustment, genomic/proteomics/single-cell review, and related peer-review checks. Existing #17 geospatial work validates sample-provenance graph edges. This module is a separate #16 peer-review layer for manuscript-method validity: spatial autocorrelation, blocked validation, coordinate/projection evidence, and geography-aware reproducibility.

## Usage

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

Generated reviewer artifacts are written to `reports/`:

- `risky-audit.json`
- `clean-audit.json`
- `risky-review.md`
- `summary.svg`
- `demo.mp4`

## API

```js
const {
  evaluateGeospatialReviewPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
```

The evaluator returns a deterministic status (`READY`, `REVIEW`, or `HOLD`), finding counts, manuscript decisions, reproducibility scores, remediation actions, research-gap opportunities, and a stable fingerprint.
