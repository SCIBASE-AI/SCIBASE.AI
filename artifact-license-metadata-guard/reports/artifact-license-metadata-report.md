# Artifact License and Metadata Guard Report

Batch: artifact-batch-2026-05-29
Generated: 2026-05-29T13:22:00.000Z

## Summary

- Artifacts evaluated: 4
- Release ready: 2
- Held for curation: 2
- Findings: 7

## Decisions

### dataset-river-001

- File: river-sediment-metals.csv
- Decision: release-ready
- Findings: none
- Actions: publish artifact; include in FAIR export manifest

### model-clinical-002

- File: clinical-risk-model.bin
- Decision: hold-for-curation
- Findings: license proprietary is not public-release compatible; missing checksum coverage; missing persistent identifier; missing metadata fields: publisher, publicationYear, schema.org; sensitive artifact marked public: clinical-derived
- Actions: hold artifact release; request metadata/license remediation; exclude from public FAIR bundle

### code-analysis-003

- File: run_analysis.py
- Decision: release-ready
- Findings: none
- Actions: publish artifact; include in FAIR export manifest

### supplement-004

- File: interview-notes-redacted.pdf
- Decision: hold-for-curation
- Findings: missing metadata fields: schema.org; human-subjects supplement should not use unrestricted CC0 release
- Actions: hold artifact release; request metadata/license remediation; exclude from public FAIR bundle
