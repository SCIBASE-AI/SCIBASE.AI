# Enterprise policy exception review

Institution: inst-northstar-research
Status: review_required

## Findings
- exc-compute-vendor: Attach compensating controls such as scoped tokens, export hold, audit sampling, or encryption.
- exc-api-schema: Expire the exception and force a new review before the integration or export runs again.
- exc-restricted-export: Collect all required DPA, funder, security, and data-steward approvals before granting the exception.
- exc-orphaned-integration: Assign an active institutional owner before the exception can remain open.

## Webhook signature bases
- inst-northstar-research:exc-compute-vendor:compensating_control_gap:2026-05-20T12:00:00Z
- inst-northstar-research:exc-api-schema:expired_exception:2026-05-20T12:00:00Z
- inst-northstar-research:exc-restricted-export:missing_required_approval:2026-05-20T12:00:00Z
- inst-northstar-research:exc-orphaned-integration:owner_accountability_missing:2026-05-20T12:00:00Z

Audit digest: c83bd392a365a6155ba4fa5b22d88d7d4024beca67d86b300321c360ce0889a1
