# Requirement Map

| Issue requirement | Implementation |
| --- | --- |
| Enterprise/admin tooling | `buildAdminDashboard` summarizes institution status, seats, projects, access posture, and alerts. |
| Contributor and usage analytics | `buildUsageAnalytics` reports active users, compute/storage usage, repositories, reviews, and trend deltas. |
| Compliance analytics/export | `buildComplianceExport` creates retention, residency, consent, audit-log, and access-review export manifests. |
| Secure API catalog | `buildApiCatalog` lists endpoint scopes, rate limits, owners, and key rotation policies. |
| Webhooks/integrations | `planWebhookDelivery` models signed events, retry behavior, dead-letter queues, and subscribers. |
| Formatting plugin metadata | `buildFormattingPlugins` exposes citation, manuscript, grant, and compliance export plugin contracts. |
| Local demo and tests | `src/server.js` exposes API endpoints; `test/tooling.test.js` covers the workflows. |
