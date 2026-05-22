# Enterprise Repository Deposit Reconciliation Packet

Generated: 2026-05-21T12:00:00.000Z
Overall status: hold_repository_reconciliation
Audit digest: bf3fb0f7d89935063a9a3c9d7767d569ee1565655f9ee4290c53aefa3e8e5450

## Summary

- Packages reviewed: 2
- Deposit targets reviewed: 3
- Verified targets: 1
- Follow-up targets: 1
- Held targets: 1
- Critical findings: 9
- Warning findings: 6
- Next poll date: 2026-05-22

## Package Decisions

| Package | Institution | Version | Status | Critical | Warnings |
| --- | --- | --- | --- | ---: | ---: |
| Single-cell Atlas Reanalysis | Northbridge University | v3.2.0 | hold_repository_reconciliation | 9 | 2 |
| Crop Resilience Preprint Package | Westlake Plant Science Institute | v1.0.0 | needs_repository_follow_up | 0 | 4 |

## Reviewer Actions

| Severity | Package | Repository | Code | Action |
| --- | --- | --- | --- | --- |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | access_policy_mismatch | Do not certify the export until access, embargo, or restricted-data policy is reconciled. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | artifact_checksum_mismatch | Hold publication credit until the repository file is replaced or the package version is corrected. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | contributor_orcid_missing | Update repository metadata before the institutional profile or ORCID sync is marked complete. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | funder_open_access_deadline_missed | Escalate to the institutional compliance owner before reporting funder compliance. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | license_metadata_mismatch | Correct the repository license field before downstream reuse or compliance export. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | persistent_identifier_mismatch | Do not mark the export complete until the repository record points at the intended identifier. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | repository_version_mismatch | Reconcile the repository record or redeposit the exact version before reporting compliance. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | required_artifact_missing_from_deposit | Re-run the export package and verify that every required artifact appears in the deposit manifest. |
| critical | pkg-cell-atlas-2026 | dspace-cell-atlas | webhook_signature_invalid | Treat the acknowledgement as untrusted and require a signed replay or API poll. |
| warning | pkg-cell-atlas-2026 | dspace-cell-atlas | credit_role_missing | Patch the repository metadata so contributor credit remains auditable. |
| warning | pkg-cell-atlas-2026 | dspace-cell-atlas | metadata_standard_missing | Patch the repository metadata before syncing the record to institutional dashboards. |
| warning | pkg-crop-resilience-preprint | invenio-crop | credit_role_missing | Patch the repository metadata so contributor credit remains auditable. |
| warning | pkg-crop-resilience-preprint | invenio-crop | metadata_standard_missing | Patch the repository metadata before syncing the record to institutional dashboards. |
| warning | pkg-crop-resilience-preprint | invenio-crop | repository_not_indexed | Keep the export in follow-up until the indexing webhook or poll result arrives. |
| warning | pkg-crop-resilience-preprint | invenio-crop | webhook_acknowledgement_missing | Poll the repository or replay the webhook before closing the enterprise export task. |
