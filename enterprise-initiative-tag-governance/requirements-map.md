# Requirements Map

| Issue #19 requirement | Coverage in this module |
| --- | --- |
| Admin dashboards | Produces dashboard rollups by initiative tag and department, with approved, held, warning, and blocker counts. |
| Custom tags or flags for internal initiatives | Validates controlled tag policies such as `GRANT-TRACKED`, `DOCTORAL-WORK`, and `PUBLIC-INITIATIVE`. |
| Contributor and productivity analytics integrity | Holds tags that lack owner approval, required evidence, valid scope, or expiry before they can influence rollups. |
| Compliance tracking | Checks funder linkage, open-access status, reproducibility score thresholds, and restricted-data dashboard exposure. |
| API and webhooks | Emits signed webhook-ready governance events for each approved or held initiative tag. |
| Enterprise-scale oversight | Produces deterministic reviewer packets and audit digests suitable for institutional admin review. |

## Non-Overlap Note

This submission is distinct from the existing dashboard/export/webhook/compliance/identity/retention/data-residency/SLA/lab-inventory/secret-rotation/quota/API-change/connector-certification/incident/funder-reporting/AI-model-governance/dashboard-attribution submissions. It focuses specifically on institution-defined initiative tag governance before dashboard and webhook publication.
