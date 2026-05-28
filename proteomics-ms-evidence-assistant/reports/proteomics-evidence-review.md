# Proteomics Mass-Spectrometry Evidence Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Studies reviewed: 4
- Reviewer ready: 1
- Targeted revision: 0
- Major revision: 0
- Blocked: 3
- Average evidence score: 36

## Requirement Map

- Auto peer review reports: flags proteomics-specific claims that need reviewer attention.
- Claims versus evidence alignment: checks peptide/protein FDR, protein inference, PTM localization, and biomarker validation.
- Reproducibility checker: verifies raw files, workflow files, environment locks, parameter manifests, and result checksums.
- Adaptive domain template: specializes the assistant for LC-MS/MS, DIA, TMT, PTM, and biomarker manuscripts.

## Findings

### DIA-PASEF plasma biomarker validation

- Decision: reviewer-ready
- Evidence score: 100
- Finding count: 0

Actions:
- Proceed to reviewer-ready peer-review packet with proteomics evidence attached.

### Discovery proteomics with loose FDR and weak inference

- Decision: block-reviewer-ready-status
- Evidence score: 0
- Finding count: 17
- critical: peptide-fdr-above-threshold - Peptide-level FDR exceeds the standard 1% review threshold.
- critical: protein-fdr-above-threshold - Protein-level FDR exceeds the standard 1% review threshold.
- high: missing-decoy-strategy - Search packet does not document target-decoy or equivalent error control.
- high: missing-protein-database-version - Protein database version is missing from the manuscript packet.
- medium: wide-search-tolerance - Mass tolerances are broad enough to require extra false-discovery justification.
- high: missing-normalization - Quantification packet does not include a usable normalization strategy.
- high: batch-control-gap - Batch randomization or adjustment evidence is incomplete.
- medium: high-qc-cv - QC coefficient of variation is above the 20% review target.
- high: high-missingness - Feature missingness is high enough to threaten claim stability.
- high: weak-protein-inference - Protein-level claim relies on weak unique-peptide or inference evidence.
- high: missing-validation-cohort - Biomarker claim lacks independent validation cohort evidence.
- medium: biomarker-effect-weak - Biomarker claim has weak adjusted significance for reviewer-ready wording.
- critical: missing-raw-files - Raw LC-MS/MS file count is lower than the sample manifest expects.
- high: missing-public-raw-accession - No public or controlled-access raw data accession is included.
- high: missing-workflow-file - No executable search or quantification workflow is listed.
- medium: missing-environment-lock - Environment lockfile is missing.
- medium: incomplete-reproducibility-manifest - Parameter manifest or result checksums are incomplete.

Actions:
- Tighten peptide-spectrum match filtering or qualify affected claims.
- Recompute protein groups at 1% FDR or downgrade protein-level conclusions.
- Attach decoy strategy, FDR estimation method, and thresholding notes.
- Record UniProt/refseq database version and contaminant database handling.
- Explain instrument mode and validate tolerance choices against decoy performance.
- Add normalization method and show effect on key protein estimates.
- Provide batch design, bridge samples, and adjusted sensitivity analysis.
- Add QC trend plots and exclude unstable features or batches.
- Report missingness handling and run sensitivity analysis for key claims.
- Require at least two unique peptides per claimed protein or qualify protein-group ambiguity.
- Mark the finding as discovery-only or add validation cohort support.
- Calibrate claim wording and show correction method with confidence intervals.
- Block reviewer-ready status until raw files or documented exclusions are attached.
- Deposit raw data in a proteomics repository or document controlled-access route.
- Attach workflow, scripts, and execution notes for reproducibility checking.
- Add conda, container, lockfile, or versioned workflow environment evidence.
- Attach search parameters and digest output tables for rerun comparison.

### Phosphoproteomics signaling claims without localization support

- Decision: block-reviewer-ready-status
- Evidence score: 28
- Finding count: 4
- critical: protein-fdr-above-threshold - Protein-level FDR exceeds the standard 1% review threshold.
- high: batch-control-gap - Batch randomization or adjustment evidence is incomplete.
- critical: weak-ptm-localization - PTM site claim lacks localization probability above 0.75.
- medium: missing-environment-lock - Environment lockfile is missing.

Actions:
- Recompute protein groups at 1% FDR or downgrade protein-level conclusions.
- Provide batch design, bridge samples, and adjusted sensitivity analysis.
- Downgrade site-specific language or add site-localization evidence.
- Add conda, container, lockfile, or versioned workflow environment evidence.

### DIA cohort study missing library and raw package evidence

- Decision: block-reviewer-ready-status
- Evidence score: 14
- Finding count: 5
- critical: protein-fdr-above-threshold - Protein-level FDR exceeds the standard 1% review threshold.
- high: missing-dia-library - DIA analysis lacks spectral library or library-free search evidence.
- critical: missing-raw-files - Raw LC-MS/MS file count is lower than the sample manifest expects.
- high: missing-public-raw-accession - No public or controlled-access raw data accession is included.
- medium: incomplete-reproducibility-manifest - Parameter manifest or result checksums are incomplete.

Actions:
- Recompute protein groups at 1% FDR or downgrade protein-level conclusions.
- Attach spectral library, library-free settings, or library construction manifest.
- Block reviewer-ready status until raw files or documented exclusions are attached.
- Deposit raw data in a proteomics repository or document controlled-access route.
- Attach search parameters and digest output tables for rerun comparison.
