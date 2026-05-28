# Proteomics Mass Spectrometry Evidence Reviewer

This self-contained reviewer checks synthetic proteomics manuscript packets before AI-assisted summaries rely on mass-spectrometry evidence.

It focuses on evidence quality for LC-MS/MS and related proteomics workflows:

- peptide and protein false-discovery-rate controls
- peptide-to-protein ambiguity and unique peptide support
- batch, instrument, retention-time, and normalization drift
- missing-value handling and replicate adequacy
- PTM localization confidence
- raw-data accession and search-parameter completeness
- differential abundance claim support

The module performs no external API calls and uses only synthetic fixture data.

## Run

```sh
node ai-powered-research-assistant-suite/proteomics-mass-spectrometry-evidence-reviewer/test.js
node ai-powered-research-assistant-suite/proteomics-mass-spectrometry-evidence-reviewer/demo.js
node ai-powered-research-assistant-suite/proteomics-mass-spectrometry-evidence-reviewer/make-demo-video.js
```

Generated reviewer artifacts are written to `reports/`.
