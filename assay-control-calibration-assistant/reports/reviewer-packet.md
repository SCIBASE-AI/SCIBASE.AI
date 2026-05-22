# Assay Control Calibration Assistant Report

Manuscript: ms-missing-controls
Generated: 2026-05-23T02:00:00Z
Decision: hold-for-review
Readiness score: 10

## Packet Summary

Assays: 1
Controls: 1
Missing controls: 3
Failed controls: 0
Calibration issues: 0
QC issues: 0
Findings: 3

## Findings

- critical: missing-control - elisa-cytokine-panel lacks required positive control evidence
- critical: missing-control - elisa-cytokine-panel lacks required negative control evidence
- critical: missing-control - elisa-cytokine-panel lacks required blank control evidence

## Required Actions

- attach_control_evidence: elisa-cytokine-panel:positive (reviewers need explicit control evidence before assay results are released)
- attach_control_evidence: elisa-cytokine-panel:negative (reviewers need explicit control evidence before assay results are released)
- attach_control_evidence: elisa-cytokine-panel:blank (reviewers need explicit control evidence before assay results are released)

---
# Assay Control Calibration Assistant Report

Manuscript: ms-calibration-drift
Generated: 2026-05-23T02:00:00Z
Decision: needs-author-response
Readiness score: 70

## Packet Summary

Assays: 1
Controls: 3
Missing controls: 0
Failed controls: 0
Calibration issues: 2
QC issues: 0
Findings: 2

## Findings

- major: weak-calibration-fit - lcms-metabolomics calibration fit 0.982 is below 0.995
- major: calibration-drift - lcms-metabolomics calibration drift 8.4% exceeds 5%

## Required Actions

- provide_standard_curve_evidence: lcms-metabolomics:std-curve-lcms-4 (weak standard curve fit needs source standards or recalibration evidence)
- rerun_or_explain_calibration: lcms-metabolomics:std-curve-lcms-4 (calibration drift must be rerun or explained before release)

---
# Assay Control Calibration Assistant Report

Manuscript: ms-qc-variation
Generated: 2026-05-23T02:00:00Z
Decision: needs-author-response
Readiness score: 70

## Packet Summary

Assays: 1
Controls: 3
Missing controls: 0
Failed controls: 1
Calibration issues: 0
QC issues: 1
Findings: 2

## Findings

- major: failed-control - cell-viability-assay has failed positive control staurosporine
- major: high-qc-variation - cell-viability-assay QC replicate qc-high CV 0.22 exceeds 0.15

## Required Actions

- repeat_or_explain_control: cell-viability-assay:staurosporine (failed control must be repeated or justified before reviewer approval)
- repeat_qc_or_explain_variation: cell-viability-assay:qc-high (high replicate variation needs repeat evidence or reviewer-facing explanation)

---
# Assay Control Calibration Assistant Report

Manuscript: ms-ready-assay-packet
Generated: 2026-05-23T02:00:00Z
Decision: approved
Readiness score: 100

## Packet Summary

Assays: 1
Controls: 3
Missing controls: 0
Failed controls: 0
Calibration issues: 0
QC issues: 0
Findings: 0

## Findings

- None

## Required Actions

- None
