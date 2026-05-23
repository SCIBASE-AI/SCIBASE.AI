# Requirements Map

| Issue #17 capability | Guard coverage |
| --- | --- |
| Linked graph metadata | Validates temporal windows for graph nodes and edges before graph metadata is published. |
| Entity pages | Holds expired or future-dated nodes before entity pages expose them. |
| Knowledge navigation | Suppresses recommendations that traverse expired or future-dated paths. |
| Dynamic node types | Handles papers, datasets, methods, authors, and institutions with versioned validity windows. |
| AI recommendations | Produces publish/suppress decisions per recommendation path. |
| Graph trust and curation | Emits curator actions and deterministic digests for temporal review packets. |

## Non-overlap

This slice avoids broad graph extraction/navigation, link audit, ontology drift/alias/synonym work, relationship conflict arbitration, author-affiliation disambiguation, artifact lineage, evidence freshness, instrument-method compatibility, recommendation visibility/diversity, negative-result replication, measurement harmonization, claim qualifier checks, ethics provenance, funder award lineage, clinical trial registry guards, software/runtime compatibility, geospatial sample provenance, and biological accession crosswalk work.
