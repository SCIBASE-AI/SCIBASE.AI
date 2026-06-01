# Manuscript Terminology Definition Review: oncology-organoid-draft-v1

Decision: **hold_ai_research_packet**
Audit digest: `sha256:525040b780da7400`

## Findings

| Severity | Code | Message | Action |
| --- | --- | --- | --- |
| high | `ACRONYM_EXPANSION_CONFLICT` | PDX maps to 2 different expansions in the manuscript packet. | `resolve_acronym_expansion_conflict` |
| high | `ACRONYM_NOT_EXPANDED_AT_FIRST_USE` | PDX is not expanded at first use in abstract. | `expand_acronym_at_first_use` |
| high | `LAY_SUMMARY_JARGON_UNEXPLAINED` | Generated layperson summary summary-lay includes patient-derived xenograft without an accessible definition. | `rewrite_lay_summary_with_definition` |
| high | `LAY_SUMMARY_JARGON_UNEXPLAINED` | Generated layperson summary summary-lay includes organoid viability score without an accessible definition. | `rewrite_lay_summary_with_definition` |
| high | `TERM_DEFINITION_MISSING` | patient-derived xenograft requires a reviewer-facing definition before AI summaries or citation suggestions use it. | `add_reviewer_facing_definition` |
| high | `TERM_DEFINITION_MISSING` | ERBB2 requires a reviewer-facing definition before AI summaries or citation suggestions use it. | `add_reviewer_facing_definition` |
| medium | `CITATION_BEFORE_TERM_DEFINITION` | Citation recommendation cite-pdx-model uses patient-derived xenograft before the term is defined. | `define_term_before_citation_insertion` |
| medium | `CITATION_TERM_UNKNOWN` | Citation recommendation cite-unknown references an unknown terminology id. | `bind_citation_to_known_term` |
| medium | `LAY_DEFINITION_MISSING` | organoid viability score appears in a lay-facing packet without a lay definition. | `add_lay_definition_or_remove_from_lay_summary` |
| medium | `NOMENCLATURE_STYLE_MISMATCH` | ERBB2 uses protein alias style where HGNC gene symbol style is expected. | `fix_domain_nomenclature_style` |
| medium | `PREFERRED_TERM_FORM_ABSENT` | patient-derived xenograft has multiple observed forms but none match the preferred nomenclature. | `normalize_term_to_preferred_form` |
| medium | `PREFERRED_TERM_FORM_ABSENT` | ERBB2 has multiple observed forms but none match the preferred nomenclature. | `normalize_term_to_preferred_form` |

## Term Coverage

| Term | Short | Section | Definition | Lay definition | Observed forms |
| --- | --- | --- | --- | --- | --- |
| patient-derived xenograft | PDX | abstract | no | no | PDX, patient derived xenograft |
| pharmacodynamic index | PDX | results | yes | no | PDX, pharmacodynamic index |
| ERBB2 |  | title | no | no | HER2, ERBB2-positive, Her-2 |
| organoid viability score |  | lay_summary | yes | no | organoid viability score, OVS |

Synthetic data only. No uploaded manuscripts, private corpora, citation indexes, external AI APIs, credentials, or payment systems are used.
