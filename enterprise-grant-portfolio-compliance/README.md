# Enterprise Grant Portfolio Compliance

Institutional research offices need a grant-level view of funder obligations before they certify exports or submit reports. This module turns synthetic grant records into deterministic compliance decisions, admin metrics, action queues, export readiness, and signed event payloads.

## What It Covers

- Funder mandate checks for open access, data management plans, repository deposits, DOI evidence, ORCID coverage, and report deadlines.
- Portfolio metrics for institutional admins by department and funder.
- Export readiness decisions for grant and funder portal workflows.
- HMAC-signed event payloads that can be forwarded to institutional integration layers.
- Synthetic sample data only; no credentials or real institution records.

## Run It

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Enterprise grant portfolio compliance demo for Northbridge Institute of Translational Science
As of 2026-05-16: 1 ready, 1 needs review, 1 blocked
Average score: 63
NIH-R01-NEURO-142: blocked score=0 blockers=6 warnings=4
HORIZON-CLIMATE-782: ready score=100 blockers=0 warnings=0
UKRI-QUANTUM-008: needs_review score=88 blockers=0 warnings=1
Signed event sample: NIH-R01-NEURO-142 digest=... signature=...
```

## Files

- `src/grant-portfolio-compliance.js` - dependency-free mandate evaluator and signing helpers.
- `data/sample-grant-portfolio.json` - synthetic institutional grant portfolio.
- `test/grant-portfolio-compliance.test.js` - coverage for decisions, obligations, dates, and deterministic event signatures.
- `docs/requirement-map.md` - issue #19 requirement mapping and non-overlap notes.
- `docs/demo.svg` and `docs/demo.gif` - short visual demo artifacts for review.
