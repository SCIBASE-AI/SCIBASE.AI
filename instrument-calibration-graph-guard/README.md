# Instrument Calibration Graph Guard

This module adds a focused Scientific Knowledge Graph Integration slice for instrument calibration provenance.

It answers:

> Can an instrument/tool node and its experiment edges be published or used for recommendations without misleading researchers about calibration validity?

## Scope

This is distinct from broad entity extraction, ontology aliasing, sample custody, chemical identity, image metadata, software dependency, funding provenance, protocol-deviation, and temporal-validity slices. It focuses only on instrument/tool graph nodes and calibration certificate evidence.

The guard checks:

- instrument nodes have stable identifiers and serial/model metadata
- each public experiment edge points to a calibration certificate
- certificate hashes and issuers are present
- calibration validity covers the experiment timestamp
- certificates are not revoked
- measurement units match the instrument capability profile
- recommendation/publication edges are held when calibration evidence is missing or expired

## Decisions

- `PUBLISH_GRAPH_EDGE`: graph node and experiment edge are safe to publish.
- `HOLD_FOR_CURATOR`: evidence is incomplete or stale but recoverable.
- `BLOCK_RECOMMENDATION`: publishing would create a misleading recommendation or entity page.

## Run

```bash
npm test
npm run demo
```

Demo outputs are written to `artifacts/`:

- `instrument-calibration-results.json`
- `instrument-calibration-report.md`
- `instrument-calibration-summary.svg`
- `instrument-calibration-demo.mp4`

## Boundaries

- synthetic graph packets only
- no lab system integration
- no private experiment data
- no external APIs
- no credentials
- no live compliance claims
