# Biomethods Provenance Assistant

Manuscript: ms-organoid-drug-response
Decision: hold-for-author-response
Generated: 2026-05-22T14:00:00Z

## Summary

- Critical findings: 2
- Major findings: 4
- Minor findings: 0
- Specimens checked: 1
- Cell lines checked: 1
- Reagents checked: 1

## Findings

- **critical** missing-specimen-source: spec-1 is missing source, accession, facility, or cohort provenance
- **major** missing-specimen-context: spec-1 lacks biological context fields: strain, sex, age
- **critical** stale-cell-line-authentication: cl-hek293t authentication evidence is older than 365 days
- **major** missing-mycoplasma-evidence: cl-hek293t lacks mycoplasma test evidence
- **major** missing-reagent-lot: ab-gapdh lacks batch or lot evidence
- **major** missing-antibody-rrid: ab-gapdh is an antibody without RRID evidence

## Required Actions

- request_specimen_source (spec-1): reviewers need specimen origin provenance before trusting biomethods claims
- request_specimen_context (spec-1): organism, strain, sex, and age context are needed for biology peer-review templates
- refresh_cell_line_authentication (cl-hek293t): stale identity evidence can invalidate downstream biological conclusions
- provide_mycoplasma_test (cl-hek293t): cell-culture studies need contamination-screening evidence
- record_reagent_lot (ab-gapdh): batch-sensitive assays need lot traceability before peer review
- record_antibody_rrid (ab-gapdh): antibody-based claims need RRID evidence for reviewer verification

---
# Biomethods Provenance Assistant

Manuscript: ms-batch-sensitive-assay
Decision: needs-provenance-review
Generated: 2026-05-22T14:00:00Z

## Summary

- Critical findings: 0
- Major findings: 1
- Minor findings: 0
- Specimens checked: 0
- Cell lines checked: 0
- Reagents checked: 2

## Findings

- **major** reagent-batch-conflict: ELISA-IL6 appears with multiple lots without batch-effect notes

## Required Actions

- explain_reagent_batch_handling (ELISA-IL6): multi-lot reagents need batch-effect handling before claims are compared

---
# Biomethods Provenance Assistant

Manuscript: ms-complete-biomethods
Decision: ready-for-review
Generated: 2026-05-22T14:00:00Z

## Summary

- Critical findings: 0
- Major findings: 0
- Minor findings: 0
- Specimens checked: 1
- Cell lines checked: 1
- Reagents checked: 1

No blocking biomethods provenance gaps detected.
