# Proteomics Evidence Review: SYN-PROT-042

Status: **block-ai-summary**
Risk score: **100/100**
Readiness score: **0/100**

Synthetic proteomics evidence is not ready for strong AI-generated conclusions until FDR, protein-group ambiguity, batch design, missingness, PTM localization, and reproducibility gaps are resolved.

| Severity | Check | Finding | Reviewer action |
| --- | --- | --- | --- |
| critical | protein-fdr-missing | Protein-level FDR is not reported | Report protein-level FDR control, decoy counting rules, and protein-group inference settings before accepting protein abundance claims. |
| high | peptide-protein-ambiguity | Protein claims rely on weak unique-peptide support | Require unique-peptide evidence, protein-group ambiguity flags, or claim wording that reflects indistinguishable protein families. |
| high | batch-confounded-design | Batch structure is confounded with biological condition | Randomize run order or model batch explicitly; treat condition-level abundance claims as provisional until batch sensitivity is shown. |
| medium | instrument-drift | Retention-time drift lacks calibration evidence | Add pooled QC trend plots, retention-time alignment diagnostics, and acceptance thresholds for instrument drift. |
| high | missingness-handling | Missing intensity handling can inflate differential abundance | Use left-censoring-aware imputation or sensitivity analyses; avoid zero-fill-driven significance claims. |
| medium | ptm-localization | PTM localization confidence is absent | Report localization score thresholds and site ambiguity before claiming a direct kinase substrate. |
| medium | replicate-adequacy | Biological replicate count is low for broad pathway claims | Limit claims to exploratory evidence or add independent biological replication. |
| high | raw-data-availability | Raw data and search parameters are not reproducible | Provide raw files, peak lists where applicable, search-parameter exports, and a stable ProteomeXchange-style accession. |
| medium | claim-statistics-mismatch | Narrative claims exceed statistical support | Align claim language with adjusted p-values, effect sizes, and confidence intervals. |
