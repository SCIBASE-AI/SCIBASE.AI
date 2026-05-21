# Requirements Map

Issue #17 asks for entity extraction, linked data, schema.org metadata, knowledge navigation, and AI research recommendations. This submission covers the safety layer between extracted evidence and published graph/recommendation edges.

| Requirement | Coverage |
| --- | --- |
| Entity extraction outputs linked data | Validates extracted subject-predicate-object edges before publication. |
| Relationship evidence | Detects when associative evidence is overpromoted into causal graph predicates. |
| Entity pages | Holds unsafe or underqualified edges before they appear on entity pages. |
| Knowledge navigation | Ensures graph search paths preserve negative/null-result polarity. |
| AI recommendations | Blocks recommendation language that is stronger than the evidence supports. |
| Filters by domain/time/reproducibility | Requires context qualifiers such as species, assay, and dataset. |
| Explainable recommendations | Emits JSON and Markdown curator packets with blocker reasons. |

## Non-Goals

- This is not a general entity extractor.
- This is not an ontology migration or alias module.
- This is not a recommendation diversity or visibility guard.
- This is not a measurement harmonization module.
- This is not a broad graph navigator.
