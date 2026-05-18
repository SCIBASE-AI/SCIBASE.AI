# Reporting Guideline Compliance Assistant

Self-contained AI research assistant slice for SCIBASE issue #16. The module audits a research package against reporting guidelines and produces a reviewer-ready packet without external APIs, credentials, or network access.

## What It Covers

- Auto peer-review findings for guideline readiness.
- Reproducibility checks for data, code, environment, and protocol evidence.
- Research-gap signals derived from missing reporting and reproducibility evidence.
- Deterministic reviewer packet with revision actions and readiness gate.

Guidelines currently supported:

- `CONSORT` for clinical trials.
- `PRISMA` for systematic reviews.
- `ARRIVE` for animal studies.
- `SCI-READY` for generic scientific submissions.

## Run

```bash
node reporting-guideline-compliance-assistant/test.js
node reporting-guideline-compliance-assistant/demo.js
```

The demo prints a reviewer packet for a clinical-trial submission and writes `demo-output.json`.

## Files

- `index.js` - guideline selection, audit engine, reproducibility checks, reviewer packet generation.
- `test.js` - behavior tests for missing clinical-trial evidence, ready PRISMA packet, and ARRIVE research-gap generation.
- `demo.js` - deterministic demo run for reviewers.
- `requirements-map.md` - issue #16 requirement mapping.
- `demo.mp4` - short static demo artifact for the bounty review flow.

## Notes

This implementation uses only synthetic manuscript metadata. It does not call external models or services and does not require secrets.
