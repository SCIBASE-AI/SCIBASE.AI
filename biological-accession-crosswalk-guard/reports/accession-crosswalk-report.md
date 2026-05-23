# Biological Accession Crosswalk Guard Report

Graph: kg-biological-accession-demo
Generated: 2026-05-23T07:00:00Z
Decision: hold-for-curation
Readiness score: 0
Findings: 8
Audit digest: 08f1b33b690fc649

## Summary

- Nodes reviewed: 5
- Format issues: 1
- Duplicate targets: 1
- Alias issues: 2
- Taxon issues: 1
- Evidence issues: 2
- Recommendation suppressions: 1

## Findings

- CRITICAL invalid-accession-format for node-gene-p53-alias: NCBIGene accession TP53 does not match the namespace format.
- MAJOR deprecated-accession-alias for node-gene-p53-alias: Node uses a deprecated alias that should be replaced by the canonical accession before graph publication.
- MAJOR deprecated-accession-alias for node-protein-old: Node uses a deprecated alias that should be replaced by the canonical accession before graph publication.
- MAJOR taxon-mismatch for node-protein-old: Taxon 10090 does not match expected taxon 9606.
- MAJOR missing-doi-evidence for node-protein-old: Crosswalk lacks DOI-backed evidence for the entity-page edge.
- MAJOR low-crosswalk-confidence for node-protein-old: Crosswalk confidence is below the safe recommendation threshold.
- CRITICAL duplicate-canonical-target for node-gene-tp53,node-gene-p53-alias: Multiple graph nodes resolve to NCBIGene:7157.
- MAJOR unsafe-recommendation-crosswalk for node-gene-p53-alias: Recommendation path uses a node with unresolved crosswalk findings.

## Required Actions

- fix_accession_namespace (node-gene-p53-alias): Correct the accession namespace or replace the node with a valid identifier.
- replace_deprecated_alias (node-gene-p53-alias): Replace deprecated aliases with the current canonical accession.
- replace_deprecated_alias (node-protein-old): Replace deprecated aliases with the current canonical accession.
- resolve_taxon_crosswalk (node-protein-old): Resolve taxon mismatch before recommendations use this node.
- attach_doi_evidence (node-protein-old): Attach DOI-backed evidence for the crosswalk edge.
- raise_crosswalk_confidence (node-protein-old): Add stronger evidence or curator approval to raise crosswalk confidence.
- merge_duplicate_canonical_nodes (node-gene-tp53,node-gene-p53-alias): Merge duplicate canonical nodes and preserve edge provenance.
- suppress_unsafe_recommendation (node-gene-p53-alias): Suppress recommendations using unresolved crosswalk nodes.
