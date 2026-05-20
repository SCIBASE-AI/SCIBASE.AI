# Funding and COI Influence Graph Guard

This module adds a focused funding and conflict-of-interest influence guard for the Scientific Knowledge Graph Integration bounty in issue #17. It evaluates whether funder, sponsor, institution, author, dataset, and publication edges are safe to use in recommendations and entity pages.

The scope is distinct from broad extractors, navigators, link audits, knowledge-gap explorers, ontology drift, relationship conflict arbitration, author-affiliation disambiguation, artifact lineage, evidence freshness, instrument/method compatibility, reproducibility route planning, recommendation visibility, negative-result replication, measurement harmonization, and ontology deprecation aliases.

## What It Checks

- Funding concentration across publication and preprint graph edges.
- Undisclosed risky funding from industry sponsors, vendors, and patent holders.
- COI disclosure coverage across work-level graph edges.
- Sponsor-controlled datasets without independent access review.
- Author affiliation overlap with funders.
- Recommendation suppression, quarantine, annotation, curator tasks, and audit digests.

## Run The Demo

From the repository root:

```bash
node funding-coi-influence-graph-guard/test.js
node funding-coi-influence-graph-guard/demo.js
```

The demo writes JSON, Markdown, SVG, and MP4 reviewer artifacts under `funding-coi-influence-graph-guard/reports/`.
