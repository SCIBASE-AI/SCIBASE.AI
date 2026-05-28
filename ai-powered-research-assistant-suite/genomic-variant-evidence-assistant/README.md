# Genomic Variant Evidence Assistant

This module is a focused AI-Powered Research Assistant Suite slice for issue #16. It reviews whether genomic variant claims are supported by nomenclature, reference-build, population-frequency, ClinVar, segregation, phenotype, functional-assay, and reproducibility evidence before an AI peer-review packet endorses them.

It checks:

- missing or inconsistent reference genome builds and transcripts
- incomplete HGVS cDNA/protein nomenclature
- rare-disease pathogenic claims contradicted by population allele frequencies
- ClinVar benign/conflicting classifications without adjudication
- underpowered segregation evidence for family claims
- functional assay support without controls, replication, or validated protocols
- ancestry-mismatched burden comparisons
- computational-only evidence used for strong pathogenicity claims
- low phenotype overlap for asserted genotype-phenotype matches
- missing callset, pipeline, validation, or parameter-digest evidence

All fixtures are synthetic. The module does not use credentials, private genomic data, patient records, external APIs, citation services, model providers, or live variant databases.

## Run

```sh
node ai-powered-research-assistant-suite/genomic-variant-evidence-assistant/test.js
node ai-powered-research-assistant-suite/genomic-variant-evidence-assistant/demo.js
node ai-powered-research-assistant-suite/genomic-variant-evidence-assistant/make-demo-video.js
```

The demo writes reviewer artifacts to `reports/`:

- `genomic-variant-evidence-review.json`
- `genomic-variant-evidence-review.md`
- `genomic-variant-evidence-summary.svg`
- `demo.mp4`

## Bounty Fit

Issue #16 asks for AI peer-review reports that detect methodological red flags, claim/evidence alignment problems, and reproducibility risks across scientific domains. This slice adds a deterministic genomics review layer that can hold, revise, or approve variant pathogenicity claims before the assistant presents reviewer-ready feedback.
