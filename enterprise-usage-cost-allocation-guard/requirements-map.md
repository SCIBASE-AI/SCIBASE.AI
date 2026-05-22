# Requirements Map

| Issue #19 area | Coverage |
| --- | --- |
| Admin dashboards | Produces allocation, hold, reallocation, and private-review totals for institutional admins. |
| Usage stats | Evaluates storage, compute, submission, and AI-review spend records. |
| Compliance tracking | Blocks chargeback when grant windows, cost centers, owner sponsorship, or evidence are invalid. |
| Custom tags and internal initiatives | Preserves lab, grant, cost-center, project, and owner IDs for dashboard rollups. |
| Export pipelines | Emits reviewer packets suitable for grant closeout and chargeback export review. |
| API/webhooks | Outputs deterministic decisions and audit digests that can back future signed events. |

## Non-overlap

This is not a broad dashboard, export, webhook replay, compliance evidence,
identity provisioning, retention/legal hold, data residency, SLA, secret
rotation, quota, API-change, connector certification, incident, funder reporting,
AI-model governance, dashboard attribution, initiative-tag, policy-exception,
IRB, data-export approval, SCIM, deposit reconciliation, or admin notification
slice. It focuses specifically on usage cost allocation and chargeback safety.
