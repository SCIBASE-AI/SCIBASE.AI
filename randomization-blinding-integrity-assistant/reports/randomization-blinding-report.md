# Randomization Blinding Integrity Assistant Report

Manuscript: ms-randomized-review-demo
Generated: 2026-05-23T06:00:00Z
Decision: hold-for-review
Readiness score: 0
Findings: 6
Audit digest: d8ee0413885e0ff3

## Summary

- Studies reviewed: 3
- Randomization issues: 2
- Blinding issues: 3
- Exclusion issues: 1
- Balance issues: 0

## Findings

- CRITICAL missing-randomization-sequence in trial-microbiome-01: Randomization sequence evidence is missing from the reviewer packet.
- CRITICAL missing-allocation-concealment in trial-microbiome-01: Allocation concealment is not documented before outcome review.
- MAJOR missing-blinding-role in animal-stroke-02: Blinding is missing for analyst.
- MAJOR arm-label-leakage in animal-stroke-02: Arm labels are visible in analysis or reviewer artifacts before endpoint lock.
- MAJOR early-unblinding-event in animal-stroke-02: Unblinding occurred before primary endpoint lock.
- MAJOR unblinded-post-randomization-exclusion in animal-stroke-02: Post-randomization exclusion lacks blinded decision evidence.

## Required Actions

- attach_randomization_sequence (trial-microbiome-01): Attach sequence generation evidence or randomization service export.
- document_allocation_concealment (trial-microbiome-01): Document who concealed allocation and when assignments became visible.
- document_blinding_roles (animal-stroke-02): Document blinded roles or explain why a role could not be blinded.
- mask_arm_labels_before_analysis (animal-stroke-02): Mask labels in notebooks, tables, and reviewer packets before endpoint lock.
- explain_unblinding_event (animal-stroke-02): Explain unblinding timing, affected roles, and sensitivity analysis impact.
- justify_unblinded_exclusion (animal-stroke-02): Justify post-randomization exclusions with blinded adjudication evidence.
