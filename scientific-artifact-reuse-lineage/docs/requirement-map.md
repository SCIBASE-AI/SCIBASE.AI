# Requirement Map

| Issue #17 requirement | Module coverage |
| --- | --- |
| Parse uploaded content into scientific graph entities | Models datasets, notebooks, protocols, projects, and papers as typed graph nodes with keyword/domain metadata. |
| Cited references, DOIs, tools, protocols, datasets | Stores DOI/license/language metadata and links artifacts through scored `reuses`, `executes`, `usesProtocol`, and `supports` relationships. |
| Linked data and schema-oriented metadata | Emits normalized node, edge, path, and recommendation payloads that can be converted to linked-data/entity pages. |
| Knowledge navigation queries | Provides `projectsByDataset`, `papersByDataset`, `experimentsByNotebook`, and `projectsByProtocol` query payloads. |
| Show all projects citing/reusing a dataset | `projectsByDataset` groups lineage paths from each dataset to project consumers. |
| Find experiments that reused a notebook | `experimentsByNotebook` groups notebook execution lineage by downstream project. |
| AI research recommendations | Recommendation requests return ranked artifacts with keyword overlap, confidence, evidence paths, and suppression reasons. |
| Trust and curator workflow | Weak, stale, checksum-conflicted, or license-unreviewed lineage creates curator actions before strong recommendations are shown. |
| Reviewer verification | Includes synthetic data, Node tests, CLI demo output, and generated SVG/GIF demo artifacts. |
