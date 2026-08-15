# Portable biomarker triage assistant for multi-site oncology cohorts

Assistant: external-validity-transfer-assistant
Overall decision: hold-for-transfer-evidence
Average transfer score: 44

## Severity Summary

- Critical: 0
- High: 5
- Medium: 5
- Low: 0

## Claim Reviews

### claim-generalizable-oncology

Decision: quarantine-from-review-packet
Score: 0
Evidence artifacts: 2
- HIGH population-transfer-gap: Claim claim-generalizable-oncology asserts populations not represented in linked evidence: pediatric, underrepresented ancestry.
  Action: Narrow the claim wording or add external validation for each missing population.
- HIGH setting-transfer-gap: Claim claim-generalizable-oncology asserts settings not represented in linked evidence: community hospital, international site.
  Action: Add site-level validation evidence or mark the setting as a future research gap.
- MEDIUM assay-transfer-gap: Claim claim-generalizable-oncology references unsupported assay or instrument contexts: single-cell-rna-seq.
  Action: Separate assay-specific claims and document conversion limits before reviewer release.
- MEDIUM runtime-transfer-gap: Claim claim-generalizable-oncology references runtime environments not covered by rerun evidence: cuda, cpu-only.
  Action: Run the pipeline in each deployment-like environment or downgrade deployment readiness language.
- HIGH no-external-validation: Claim claim-generalizable-oncology has broad transfer language without external validation evidence.
  Action: Hold broad generalizability language until at least one independent validation artifact is linked.
- MEDIUM strong-claim-subgroup-undercoverage: Strong claim claim-generalizable-oncology does not cover required subgroup evidence: pediatric, underrepresented ancestry.
  Action: Convert the claim to qualified language or create a subgroup-specific validation plan.

### claim-reproducible-pipeline

Decision: review-ready
Score: 100
Evidence artifacts: 3
- No transfer-risk findings.

### claim-deployment-ready

Decision: quarantine-from-review-packet
Score: 32
Evidence artifacts: 1
- MEDIUM setting-transfer-gap: Claim claim-deployment-ready asserts settings not represented in linked evidence: low-resource clinic.
  Action: Add site-level validation evidence or mark the setting as a future research gap.
- HIGH no-external-validation: Claim claim-deployment-ready has broad transfer language without external validation evidence.
  Action: Hold broad generalizability language until at least one independent validation artifact is linked.
- HIGH no-runnable-transfer-evidence: Claim claim-deployment-ready lacks reproducible runtime evidence for the asserted context.
  Action: Add a deterministic runbook, manifest, or notebook rerun before the assistant marks the claim reproducible.
- MEDIUM strong-claim-subgroup-undercoverage: Strong claim claim-deployment-ready does not cover required subgroup evidence: pediatric, underrepresented ancestry.
  Action: Convert the claim to qualified language or create a subgroup-specific validation plan.

## Reproducibility Actions

- recommended: claim-generalizable-oncology - Run the pipeline in each deployment-like environment or downgrade deployment readiness language.
- blocking: claim-generalizable-oncology - Hold broad generalizability language until at least one independent validation artifact is linked.
- blocking: claim-deployment-ready - Hold broad generalizability language until at least one independent validation artifact is linked.
- blocking: claim-deployment-ready - Add a deterministic runbook, manifest, or notebook rerun before the assistant marks the claim reproducible.

## Research Gap Prompts

- high: pediatric oncology RNA-seq validation - frequently cited limitation with low replication coverage
- high: CPU-only low-resource clinic reproducibility run - deployment claim depends on clinic-like runtime evidence
- high: ancestry-balanced external validation - underrepresented ancestry is asserted but not evidenced
