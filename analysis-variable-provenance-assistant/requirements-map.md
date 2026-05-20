# Requirements Map

| Issue #16 requirement | Implementation coverage |
| --- | --- |
| Auto peer review reports | Emits reviewer-ready findings and priority actions for manuscript analysis-variable risks. |
| Statistical or methodological red flags | Flags unit drift, missing cohort filters, stale transform hashes, incomplete lineage, and failed transforms. |
| Claims vs. evidence alignment | Maps manuscript analysis claims to variables, dictionary records, producing transforms, and prior reproducibility attempts. |
| Reproducibility checker | Checks dependency-like transform hashes, deterministic flags, pipeline test status, and failed prior attempts. |
| Output consistency with reported results | Flags stale transform hashes and failed reproducibility attempts that can change reported outputs. |
| Dependency/version integrity | Treats transform hashes and producing pipeline records as deterministic provenance evidence. |
| Presence of raw data, clean pipelines, and test sets | Requires data dictionary entries, producing transforms, lineage inputs, and passing pipeline tests. |
| Reproducibility confidence score | Assigns each analysis a confidence score and decision. |
| Links to previous reproducibility attempts | Links failed attempts to affected manuscript analyses and reviewer actions. |

## Non-Overlap Statement

This slice focuses on analysis-variable provenance. It does not duplicate broad assistant-suite foundations, protocol trace, evidence grounding, statistics review, gap planning, rebuttal response packs, ethics/data-availability checks, citation-context reconciliation, reporting-guideline compliance, benchmark-leakage auditing, or figure/table consistency checks.
