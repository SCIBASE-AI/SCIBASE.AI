# Requirements Map

Issue: `SCIBASE-AI/SCIBASE.AI#13`

| Issue requirement | Implementation |
| --- | --- |
| AI citation tool | Validates uniquely identified citation candidates and rejects malformed model-output fields before one-click insertion into a manuscript. |
| Context-aware retrieval | Checks candidate relation to highlighted claims: supports, contradicts, contextualizes, or irrelevant. |
| Completeness and relevance | Scores evidence strength, field fit, stale evidence, and citation intent alignment. |
| Peer-review quality | Blocks misleading direct-support citations and requires notes for contradictory evidence. |
| Safe local validation | Includes dependency-free tests and demo generation from synthetic manuscript/citation metadata only. |

## Non-goals

- No live DOI, Crossref, PubMed, arXiv, Semantic Scholar, publisher, corpus, or citation database calls.
- No private manuscripts, credentials, real literature metadata, or live citation insertions.
- No replacement for citation metadata, style, diversity, retraction, provenance, similarity, ethics, unit, or biomethods workflows.
