# Requirements Map

| Issue #17 capability | Coverage in this slice |
| --- | --- |
| Entity pages with aggregated context | `buildJsonLdPacket()` emits recommendation/entity review packets with ethics review metadata. |
| Knowledge navigation and filters | Recommendations are evaluated against user context before graph routes are displayed. |
| AI research recommendations | `evaluateEthicsProvenance()` returns `show` or `hold` decisions for recommendation payloads. |
| Tools, datasets, protocols, and papers | Sample data includes datasets, notebooks, protocols, and papers as graph nodes. |
| Evidence-backed relationships | Each recommendation is evaluated through attached evidence records. |
| Safe discovery workflows | Curator actions explain why unsafe paths are held and what evidence is required. |

## Scope Boundaries

This is not a broad extractor, graph navigator, ontology drift guard, relationship conflict arbiter, author-affiliation disambiguator, artifact lineage tracker, evidence freshness module, instrument/method compatibility checker, reproducibility route planner, recommendation visibility/diversity guard, negative-result replication graph, measurement harmonization guard, or claim qualifier guard.

The slice focuses only on ethics provenance before graph recommendations and entity-page packets are shown.
