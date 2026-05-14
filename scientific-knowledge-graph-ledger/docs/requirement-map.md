# Requirement Map

| Issue #17 requirement | Implementation |
| --- | --- |
| Entity extraction from papers, datasets, notebooks, and protocols | `extractEntities()` extracts datasets, methods, tools, concepts, references, authors, and affiliations from document text. |
| Linked data and metadata | `buildGraph()` creates typed nodes and evidence-backed relationships; `exportJsonLd()` emits schema.org-style JSON-LD. |
| Entity pages | `buildEntityPage()` aggregates relationship counts and usage contexts for a selected entity. |
| Knowledge navigation/search | `searchGraph()` supports query, type, and reproducibility filters. |
| Dynamic node types | Nodes include documents, authors, datasets, tools, concepts, methods, and references. |
| AI research recommendations | `recommendResearch()` produces context-aware recommendation payloads from interests, citations, and reproducibility scores. |
| Discovery mode/sidebar/digest payload | Recommendation output includes document IDs, titles, scores, and reason codes suitable for UI or digest rendering. |
| Reviewer-friendly demo/API | `src/demo.js` prints a full report; `src/api.js` serves `/health` and `/demo-report`. |
| Tests | `test/knowledge-graph.test.js` covers extraction, graph relationships, search, entity pages, JSON-LD, recommendations, and demo shape. |
