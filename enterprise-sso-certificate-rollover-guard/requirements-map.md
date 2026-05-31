# Requirement Map

Issue #19 asks for Enterprise Tooling that gives institutions governance, visibility, and integration controls. This module maps to that enterprise layer by making SAML/SSO metadata release safer for institutional tenants.

| Enterprise tooling capability | Guard coverage |
| --- | --- |
| Admin dashboards | Produces tenant-level release decisions and finding counts that an institutional admin dashboard can display before SSO metadata changes. |
| API and webhooks | Prevents unsafe identity-provider metadata from being released to connected enterprise systems that rely on stable SSO state. |
| Export pipelines | Checks downstream metadata refresh evidence so repository, LMS, HRIS, and lab-system integrations are not surprised by certificate rollover. |
| Compliance tracking | Emits deterministic audit digests and evidence records for enterprise identity governance. |
| Institutional integrations | Validates entity ID, ACS URL, certificate validity, signing algorithm, and rollover overlap before integration changes are approved. |

## Non-overlap Notes

- Not SCIM deprovisioning: it does not reconcile leavers, active users, roles, or SCIM active state.
- Not identity provisioning drift: it does not compare HRIS, ORCID, SCIM, or account lifecycle records.
- Not webhook redaction or delivery: it does not alter webhook payloads, retries, signatures, or destination delivery status.
- Not API rate limiting or contract drift: it does not evaluate API quotas, schema versions, enums, or deprecation windows.
- Not secret rotation: it does not handle API keys, webhooks secrets, credentials, or private certificate material.

## Synthetic Evidence Only

All tenants, names, domains, ticket IDs, and fingerprints are synthetic examples. Fingerprints are SHA-256 shaped placeholders and no raw certificate, key, credential, or private identity-provider configuration is included.
