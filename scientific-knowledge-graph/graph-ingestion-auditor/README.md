# Graph Ingestion Auditor

This module adds a deterministic, dependency-free knowledge graph ingestion auditor for SCIBASE issue #17. It checks whether extracted scientific entities, relationships, recommendations, and export settings are safe to publish into a project discovery graph.

## Scope

- Required entity coverage for papers, authors, datasets, methods, software, and concepts
- DOI, ORCID, DataCite/Zenodo, MeSH/OBO/Wikidata, PubChem, UniProt, SWH, and GitHub identifier checks
- Extraction confidence thresholds
- Relationship endpoint, provenance, evidence, and private-content checks
- AI recommendation evidence and private-signal visibility checks
- JSON-LD/RDF/GraphML export readiness, license, and schema version checks

All fixtures are synthetic. The module does not use private research content, user activity, live ontology services, credentials, or external APIs.

## Run

```bash
node scientific-knowledge-graph/graph-ingestion-auditor/test.js
node scientific-knowledge-graph/graph-ingestion-auditor/demo.js
node scientific-knowledge-graph/graph-ingestion-auditor/make-demo-video.js
```

Generated knowledge graph audit artifacts are written to `reports/`.
