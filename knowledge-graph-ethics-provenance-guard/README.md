# Knowledge Graph Ethics Provenance Guard

This module adds a focused ethics-provenance gate for Scientific Knowledge Graph recommendations. It evaluates whether graph recommendations and entity-page packets can be shown safely when the path references human-subject data, animal studies, restricted datasets, biosafety-controlled protocols, or dual-use methods.

The implementation is dependency-free, uses synthetic data only, and does not call external services.

## Local Verification

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `ethics-provenance-packet.json`
- `ethics-provenance-report.md`
- `summary.svg`
- `demo.mp4` when `ffmpeg` is available

## What It Guards

- Human-subject graph paths require active IRB evidence and a consent scope matching the intended reuse.
- Restricted evidence requires a data-use agreement before recommendation display.
- Biosafety-controlled protocols are held when user context lacks sufficient clearance.
- Animal-study routes require animal-care protocol evidence.
- Dual-use paths stay visible only with a review warning when no hard blocker exists.

## Reviewer Path

1. Start with `requirements-map.md` for issue coverage.
2. Read `index.js` for the guard decisions and risk scoring.
3. Run `test.js` to verify blocker behavior.
4. Run `demo.js` to regenerate deterministic review artifacts.
