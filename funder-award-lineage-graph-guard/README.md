# Funder Award Lineage Graph Guard

This module adds a focused funder award lineage guard for SCIBASE Scientific Knowledge Graph Integration.

It verifies funder, award, project, output, mandate, and recommendation edges before knowledge graph export or funder-aware recommendation display. The goal is to keep grant attribution, funder mandates, and recommendation explanations accurate when research outputs are linked into the graph.

The module is dependency-free, synthetic-data-only, and offline. It does not make grant, funder, DOI, ROR, or registry API calls.

## What It Checks

- Canonical funder nodes for each award.
- Award number presence and duplicate funder award numbers.
- Stable award URIs.
- Active/expired award status.
- Project-to-award and output-to-award graph edge integrity.
- Funding statements that mention linked awards.
- Open-access, data-sharing, and funder-reporting mandate readiness.
- Funder-aware recommendation safety for inactive or missing award lineage.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes `reports/summary.json`, `reports/reviewer-packet.md`, and `reports/summary.svg`.

## Output

The primary status is one of:

- `ready`: no blockers or warnings.
- `review`: no blockers, but graph lineage or mandate metadata needs reviewer attention.
- `hold`: knowledge graph export or recommendation display should be held until lineage blockers are repaired.

Each result includes deterministic blocker codes, remediation actions, a reviewer packet, and an audit digest.
