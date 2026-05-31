# Project Authoring Integrity Review

Generated: 2026-05-31T05:59:18.640Z
Overall decision: **HOLD**
Packet digest: `1cd3e116486fdff2`

## Public Genomics Replication Workspace

Decision: **HOLD**
Audit digest: `669c98e63184c219`
Findings: 8 (4 high, 4 medium, 0 low)

- **HIGH** `stale_notebook_code`: notebooks/analysis.ipynb was not executed against the current code artifact.
- **HIGH** `stale_notebook_dataset`: notebooks/analysis.ipynb was not executed against the current dataset checksum.
- **MEDIUM** `environment_not_pinned`: Reproducibility manifest does not pin the execution environment.
- **MEDIUM** `missing_doi`: Public publication target is missing DOI or pre-registration identifier.
- **HIGH** `citation_contributor_not_attribution_ready`: Ben Malik lacks ORCID-backed attribution consent.
- **HIGH** `restricted_dataset_public_reference`: manuscripts/main.md references restricted data without a public disclosure note.
- **MEDIUM** `discussion_signoff_missing`: manuscripts/main.md is waiting on discussion signoff evidence.
- **MEDIUM** `discussion_signoff_missing`: notebooks/analysis.ipynb is waiting on discussion signoff evidence.

## Field Notes Workspace Handoff

Decision: **REVIEW**
Audit digest: `c103dbf3b16cefe0`
Findings: 3 (0 high, 3 medium, 0 low)

- **MEDIUM** `artifact_missing_source_checksum`: manuscripts/field-notes.tex is missing source provenance checksum.
- **MEDIUM** `missing_license`: Citation metadata is missing a license.
- **MEDIUM** `missing_funding_sources`: Project citation metadata has no funding source acknowledgement.

## Clean Room Notebook Release

Decision: **ALLOW**
Audit digest: `f2e81888aa407468`
Findings: 0 (0 high, 0 medium, 0 low)

- No authoring integrity findings.

