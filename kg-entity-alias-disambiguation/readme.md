# Knowledge Graph Entity Alias Disambiguation

This module adds a focused guard for Scientific Knowledge Graph Integration. It evaluates ambiguous extracted entities before they are merged into canonical graph nodes or used to publish graph edges.

The scope is intentionally narrow. It does not implement broad entity extraction, semantic search, graph navigation UI, recommendations, author graph rendering, or ontology export. It handles the alias collision decision layer between extracted mentions and canonical graph nodes.

## What It Checks

- Candidate ontology IDs from sources such as MeSH, NCBI Gene, PubChem, Wikidata, and GeoNames
- Alias collisions where one mention can refer to different concepts
- Context overlap and confidence margins between top candidates
- Multiple proposed ontology edges for a single ambiguous mention
- Deterministic publish, hold, and curation actions

## Demo

Run:

```bash
node kg-entity-alias-disambiguation/test.js
node kg-entity-alias-disambiguation/demo.js
node kg-entity-alias-disambiguation/render-video.js
```

Generated artifacts:

- `reports/entity-disambiguation-report.json`
- `reports/entity-disambiguation-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

All data is synthetic. The module does not call external ontology APIs, DOI services, graph databases, private projects, credentials, or live SCIBASE accounts.
