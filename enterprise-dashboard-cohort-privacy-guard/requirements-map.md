# Requirements Map

Issue #19 asks for enterprise tooling across admin dashboards, analytics, compliance tracking, APIs, webhooks, and exports. This slice maps to the dashboard privacy layer that those capabilities need before institutional admins can safely view or export metrics.

| Issue #19 area | Implementation |
| --- | --- |
| Organization-wide admin dashboards | Reviews dashboard widgets for contributor activity, collaboration, open-access compliance, and resource usage. |
| Contributor analytics and activity heatmaps | Blocks named heatmap rows when contributor counts are below policy thresholds. |
| Usage stats and productivity metrics | Masks private usage rows and emits sanitized export rows. |
| Compliance tracking | Preserves institution-level compliance rollups while masking narrow department rows. |
| Custom tags and internal initiatives | Detects sensitive tags and requires approved aliases before dashboard release. |
| Webhooks and export pipelines | Blocks raw CSV, webhook, and external BI export targets when suppressed rows exist. |
| Institutional oversight | Emits admin action queues, reviewer notes, and stable audit digests for governance review. |

## Non-Overlap Notes

Existing issue #19 submissions cover broad enterprise dashboards, export packages, compliance packets, webhook delivery and replay, identity drift, retention/legal hold, data residency, SLA, secret rotation, quotas, API change governance, connector certification, incident response, funder exports, AI model governance, dashboard attribution, initiative tags, policy exceptions, IRB consent, data export approvals, SCIM deprovisioning, repository deposit reconciliation, notification escalation, cost allocation, LMS passback, webhook payload redaction, and vendor DPA review.

This module is narrower: it validates whether aggregate dashboard rows can be shown or exported without re-identifying researchers, projects, departments, labs, or small cohorts.
