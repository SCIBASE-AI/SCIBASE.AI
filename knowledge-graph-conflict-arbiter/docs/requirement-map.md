# Requirement Map

This module targets SCIBASE-AI/SCIBASE.AI issue #17, "Scientific Knowledge Graph Integration".

| Issue capability | Implementation evidence |
| --- | --- |
| Entity extraction output and linked graph relationships | data/sample-graph.json models scientific entities and extracted relationship edges with evidence spans, extractors, and sources. |
| Knowledge navigation with trustworthy graph search | src/conflict-arbiter.js groups relationship triples and quarantines contradictory edges before graph search or recommendations use them. |
| AI research recommendations with provenance | Recommendation decisions explain whether suggestions are allowed or suppressed based on relationship arbitration. |
| Entity pages with citations and usage contexts | Leading evidence records include source, source date, evidence type, polarity, and audit hash for entity-page conflict notes. |
| Cross-project inference and knowledge gaps | The arbiter prevents inference from mutually contradictory claims and emits curator actions for review gaps. |
| Structured linked data quality | Deterministic audit digests make curation packets reproducible and reviewable. |

## Non-goals

- No live PubMed, Crossref, DOI, ontology, or LLM service calls.
- No private research content or external credentials are used.
- This slice is a graph-quality control module, not another broad extractor or graph UI.
