# Chemical Identity Graph Handoff

Decision: hold_chemical_graph
Compounds reviewed: 5
Edges reviewed: 4
Held nodes: 1
Held edges: 2
Audit digest: sha256:0128a62f30867cfec310d4ff265ff6e88ad056a911cbc36f61046aa3e030e7a0

## Priority Findings

| Severity | Code | Remediation |
| --- | --- | --- |
| critical | CHEMICAL_EDGE_NODE_MISSING | block_edge_until_both_chemical_nodes_exist |
| critical | SAME_AS_SKELETON_MISMATCH | split_same_as_edge_into_distinct_compound_nodes |
| critical | STEREOCHEMISTRY_MISSING | split_or_hold_compound_until_stereochemistry_is_explicit |
| critical | SYNONYM_COLLISION_ACROSS_COMPOUNDS | quarantine_synonym_until_curator_disambiguates_compounds |
| high | ASSAY_CONTEXT_INCOMPLETE | attach_assay_context_before_recommendation |
| high | CHEMICAL_IDENTITY_EVIDENCE_MISSING | attach_doi_backed_identity_evidence |
| high | EDGE_EVIDENCE_DOI_MISSING | attach_doi_backed_edge_evidence |
| high | INCHIKEY_FORMAT_INVALID | attach_valid_inchikey_before_graph_merge |
| high | ISOMERIC_SMILES_MISSING | attach_isomeric_smiles_before_recommendation |
| high | ISOTOPE_LABEL_MISSING | attach_isotope_label_before_assay_edge_publication |
| high | SAME_AS_STEREOCHEMISTRY_MISMATCH | hold_same_as_edge_for_stereochemistry_review |
| medium | ASSAY_FORM_CONTEXT_MISMATCH | suppress_assay_recommendation_until_form_context_matches |

## Node Actions

| Compound | Status | Actions |
| --- | --- | --- |
| cmpd-thalidomide-ambiguous | hold_identity_node | split_or_hold_compound_until_stereochemistry_is_explicit, attach_doi_backed_identity_evidence, deduplicate_compound_synonyms |
| cmpd-alpha-other | publishable | none |
| cmpd-caffeine-citrate | curator_review | retain_salt_or_hydrate_form_as_explicit_graph_node |
| cmpd-caffeine-freebase | publishable | none |
| cmpd-tracer | curator_review | attach_valid_inchikey_before_graph_merge, attach_isomeric_smiles_before_recommendation, attach_isotope_label_before_assay_edge_publication |

## Edge Actions

| Edge | Status | Actions |
| --- | --- | --- |
| edge-bad-same-as | hold_graph_edge | split_same_as_edge_into_distinct_compound_nodes, hold_same_as_edge_for_stereochemistry_review |
| edge-form-conflation | curator_review | model_compound_form_relationship_instead_of_same_as |
| edge-assay-incomplete | curator_review | attach_assay_context_before_recommendation, suppress_assay_recommendation_until_form_context_matches, attach_doi_backed_edge_evidence |
| edge-missing-target | hold_graph_edge | block_edge_until_both_chemical_nodes_exist |

