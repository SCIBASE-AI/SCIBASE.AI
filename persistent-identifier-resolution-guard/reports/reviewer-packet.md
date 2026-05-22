# Persistent Identifier Resolution Guard

Issue: SCIBASE.AI #14 Scientific/Engineering Data & Code Hosting
Scope: DOI, ARK, UUID, persistent URL, landing page, resolver evidence, metadata, access, and version-chain readiness before public release.

## Release Decisions

### SCI-PID-HOLD-09
Project: Microscopy Cell Morphology Bundle
Status: HOLD
Required decision: hold_release
Audit digest: `SCI-PID-HOLD-09:hold:B=DATACITE_METADATA_INCOMPLETE|DATACITE_METADATA_INCOMPLETE|DIRECT_DOWNLOAD_FOR_RESTRICTED_ARTIFACT|LANDING_PAGE_NOT_ACCESSIBLE|MISSING_LANDING_PAGE|MISSING_RESOLVER_EVIDENCE|MISSING_REUSE_LICENSE|MISSING_REUSE_LICENSE|PERSISTENT_IDENTIFIER_COLLISION|RESOLVER_STATUS_NOT_RELEASE_READY|RESOLVER_TARGET_MISMATCH|TOMBSTONE_METADATA_MISSING|VERSION_CHAIN_TARGET_MISSING:W=RESTRICTED_ACCESS_TERMS_INCOMPLETE|SCHEMA_ORG_METADATA_INCOMPLETE|SCHEMA_ORG_METADATA_INCOMPLETE`

Blockers:
- PERSISTENT_IDENTIFIER_COLLISION: Persistent identifier doi:10.5678/scibase.cell.bundle is reused by 2 active artifacts.
- LANDING_PAGE_NOT_ACCESSIBLE: Cell morphology image bundle landing page evidence reports HTTP 404.
- RESOLVER_STATUS_NOT_RELEASE_READY: Cell morphology image bundle resolver evidence reports HTTP 500.
- RESOLVER_TARGET_MISMATCH: Cell morphology image bundle resolver target does not match the declared landing page.
- DATACITE_METADATA_INCOMPLETE: Cell morphology image bundle is missing DataCite fields: creators, publisher, types.resourceTypeGeneral.
- DIRECT_DOWNLOAD_FOR_RESTRICTED_ARTIFACT: Cell morphology image bundle is restricted but exposes a direct download URL.
- MISSING_REUSE_LICENSE: Cell morphology image bundle lacks a reuse license in artifact or schema metadata.
- VERSION_CHAIN_TARGET_MISSING: Cell morphology image bundle references missing version-chain identifier 10.5678/scibase.cell.bundle.v1.
- MISSING_LANDING_PAGE: Duplicate active analysis scripts needs a stable landing page URL before public release.
- MISSING_RESOLVER_EVIDENCE: Duplicate active analysis scripts has no captured resolver check evidence.
- DATACITE_METADATA_INCOMPLETE: Duplicate active analysis scripts is missing DataCite fields: identifier, creators, titles, publisher, publicationYear, types.resourceTypeGeneral.
- MISSING_REUSE_LICENSE: Duplicate active analysis scripts lacks a reuse license in artifact or schema metadata.
- TOMBSTONE_METADATA_MISSING: Withdrawn raw upload is withdrawn but lacks tombstone URL or reason.

Warnings:
- SCHEMA_ORG_METADATA_INCOMPLETE: Cell morphology image bundle is missing schema.org fields: url, license.
- RESTRICTED_ACCESS_TERMS_INCOMPLETE: Cell morphology image bundle needs public access terms and a request contact.
- SCHEMA_ORG_METADATA_INCOMPLETE: Duplicate active analysis scripts is missing schema.org fields: @type, identifier, name, url, license.

Remediation actions:
- Mint distinct identifiers or withdraw duplicates for doi:10.5678/scibase.cell.bundle.
- Fix landing page availability for Cell morphology image bundle.
- Fix resolver response for Cell morphology image bundle.
- Point the PID resolver for Cell morphology image bundle at the declared landing page.
- Complete DataCite metadata for Cell morphology image bundle.
- Complete schema.org discovery metadata for Cell morphology image bundle.
- Route restricted access for Cell morphology image bundle through the landing page and approval flow only.
- Attach a reuse license for Cell morphology image bundle.
- Add the referenced prior artifact or remove the broken version-chain link for Cell morphology image bundle.
- Create a landing page for Duplicate active analysis scripts and map the PID resolver to it.
- Capture resolver status, canonical target, and checked timestamp for Duplicate active analysis scripts.
- Complete DataCite metadata for Duplicate active analysis scripts.
- Complete schema.org discovery metadata for Duplicate active analysis scripts.
- Attach a reuse license for Duplicate active analysis scripts.
- Publish tombstone metadata for Withdrawn raw upload.

### SCI-PID-REVIEW-22
Project: Restricted Neuroimaging Feature Extracts
Status: REVIEW
Required decision: pid_review
Audit digest: `SCI-PID-REVIEW-22:review:B=none:W=LANDING_PAGE_NOT_INDEXABLE|RESOLVER_EVIDENCE_STALE`

Blockers:
- None.

Warnings:
- LANDING_PAGE_NOT_INDEXABLE: Controlled feature matrix landing page blocks indexing, reducing findability.
- RESOLVER_EVIDENCE_STALE: Controlled feature matrix resolver evidence is 51 days old.

Remediation actions:
- Refresh resolver evidence for Controlled feature matrix.

### SCI-PID-READY-17
Project: Open Catalyst Reaction Archive
Status: READY
Required decision: release_artifacts
Audit digest: `SCI-PID-READY-17:ready:B=none:W=none`

Blockers:
- None.

Warnings:
- None.

Remediation actions:
- None.

## Notes
This demo uses synthetic data only. It performs no live resolver calls and does not depend on external services.
