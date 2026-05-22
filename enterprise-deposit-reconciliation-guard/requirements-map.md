# Requirements Map

## Admin Dashboards

- Produces package-level and repository-target-level decisions for admin dashboard rollups.
- Separates verified, follow-up, and held deposits so institutional admins can see which exports are safe to report.
- Emits reviewer actions with deterministic codes for compliance queues.

## API & Webhooks

- Validates repository webhook acknowledgement presence and signature status.
- Preserves expected webhook topics in the evidence packet.
- Treats unsigned or missing acknowledgements as reviewable follow-up instead of silently closing the export.

## Export Pipelines

- Reconciles DSpace, InvenioRDM, Zenodo, and similar deposit receipts against the submitted package.
- Checks DOI/handle/accession, project version, license, access policy, embargo window, DataCite/schema.org metadata, ORCID contributors, CRediT roles, and file checksums.
- Blocks institutional compliance credit when repository records do not match the submitted package.

## Why This Is Distinct

Existing #19 submissions cover export readiness, funder reporting, webhook replay, connector certification, API contract changes, data export approval, incident response, dashboard attribution, SCIM/HRIS, and policy exceptions. This slice focuses on post-export proof that an external repository accepted and indexed the exact intended package with preserved identifiers, metadata, access policy, and checksums.
