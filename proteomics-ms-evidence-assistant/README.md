# Proteomics Mass-Spectrometry Evidence Assistant

Self-contained AI research assistant slice for SCIBASE issue #16. It reviews synthetic LC-MS/MS manuscript packets before they are marked reviewer-ready.

## What It Checks

- Peptide and protein FDR thresholds.
- Protein inference support and unique-peptide evidence.
- DIA spectral library or library-free search evidence.
- Normalization, batch randomization, batch adjustment, QC CV, and missingness.
- PTM localization confidence for site-specific claims.
- Biomarker validation cohort support.
- Raw file, repository accession, workflow, environment, parameter manifest, and checksum readiness.

## Why This Fits Issue #16

- Auto peer review reports: produces reviewer-ready findings and remediation actions.
- Claims versus evidence alignment: maps manuscript claims to proteomics-specific support gaps.
- Reproducibility checker: validates raw LC-MS/MS package and workflow evidence.
- Adaptive domain template: focuses on mass-spectrometry proteomics rather than a generic research assistant.

## Run

```bash
node proteomics-ms-evidence-assistant/test.js
node proteomics-ms-evidence-assistant/demo.js
node proteomics-ms-evidence-assistant/make-demo-video.js
```

Generated artifacts are written to `proteomics-ms-evidence-assistant/reports/`.

## Safety

The module uses synthetic data only. It does not call external APIs, execute submitted code, scan private repositories, access credentials, or process real research data.
