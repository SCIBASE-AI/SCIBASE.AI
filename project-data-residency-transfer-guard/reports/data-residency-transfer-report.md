# Project Data Residency Transfer Guard

Generated: 2026-05-29T00:00:00.000Z
Report digest: `df69e10d399a5cdd39225df47e8e67c725a226b0e1eaf6c9540afe12ce467573`

## Summary

- Total scenarios: 4
- Approved: 2
- Needs review: 0
- Blocked: 2
- Findings: 5

## Decisions

### pub-seq-archive-eu-review

- Decision: **blocked**
- Action: `grant_dataset_read`
- Object: `dataset:human-genomes-v3`
- Classification: `restricted-human-genomic`
- Route: EU -> US
- Audit digest: `5833dcf52dc90fd540b3b5805320322a1be5204e3081ef44bc4dda04539e542d`
- Findings:
  - blocker: missing-cross-region-dpa - Sensitive project data cannot cross residency boundaries without an approved DPA.
  - blocker: active-export-embargo - Export embargo remains active for 33 day(s).
  - review: missing-data-steward-approval - Sensitive object access requires data-steward approval evidence.

### open-metadata-catalogue

- Decision: **approved**
- Action: `publish_metadata_snapshot`
- Object: `metadata:materials-index`
- Classification: `public-metadata`
- Route: US -> US
- Audit digest: `671f131e434ab50a1548feae1bd9389942765501defd705319c546a7566c50a7`
- Findings:
  - info: public-metadata-safe - Public non-sensitive metadata transfer is allowed with current evidence.

### private-clinical-partner-sync

- Decision: **blocked**
- Action: `export_analysis_notebook`
- Object: `notebook:clinical-endpoint-model`
- Classification: `clinical-derived-sensitive`
- Route: US -> EU
- Audit digest: `7edb86c12360ad8342e565634a529b704bd90a972effe71eeac92b02ddd6bbb7`
- Findings:
  - blocker: expired-data-use-agreement - The data-use agreement is expired for the requested transfer.

### institutional-only-student-handoff

- Decision: **approved**
- Action: `grant_document_comment`
- Object: `document:field-protocol-draft`
- Classification: `internal-collaboration`
- Route: EU -> EU
- Audit digest: `b5064e73fafbfd1e2c9d756868baca9f8af162c5d9b98c44454382fd0ea9c184`
- Findings:
  - info: none - No blocking or review findings.
