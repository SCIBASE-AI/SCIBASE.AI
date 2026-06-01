# Requirements Map

Issue #19 asks for Enterprise Tooling that gives institutions governance, compliance tracking, analytics, and integration controls.

This slice covers a distinct compliance gate:

- **Compliance tracking:** verifies policy acknowledgements and training receipts before privileged enterprise actions.
- **Governance controls:** produces `hold` decisions when certificates are expired or missing.
- **Admin review readiness:** emits blocker/revision counts, researcher IDs, and remediation messages.
- **Low-risk implementation:** dependency-free JavaScript, synthetic data only, no production integrations.

Non-overlap: this is not another dashboard, webhook, SSO/SCIM, repository sync, API rate limit, vendor DPA, contract drift, legal hold, data residency, journal/style provenance, or admin audit slice.
