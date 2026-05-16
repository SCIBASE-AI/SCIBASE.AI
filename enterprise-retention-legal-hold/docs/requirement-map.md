# Requirement Map

This contribution targets the Enterprise Tooling bounty by adding a distinct retention and legal hold governance slice.

| Bounty area | Module coverage |
| --- | --- |
| Admin dashboards | `dashboardMetrics` groups retention actions by department, severity, data class, owner, affected projects, clear records, and export locks. |
| Compliance tracking | The evaluator applies institution-level retention policies, open-access evidence requirements, controlled-data legal review requirements, and missing-policy escalations. |
| API and webhooks | `createWebhookEvent` emits deterministic event envelopes for policy gaps, purge due dates, and legal hold application. |
| Export pipelines | `exportManifest` marks blocked or review-required records, records blockers, and includes stable digests for audit-ready downstream export checks. |
| Institutional visibility | Synthetic examples cover research compliance, funder compliance, peer review operations, legal counsel, and department-level reporting. |

## Why this is distinct

Existing #19 submissions focus on broad dashboards, export packages, trust centers, compliance packets, webhook replay, audit signal routing, and identity provisioning drift. This module focuses on a different enterprise risk: preserving or disposing research records correctly when retention windows, funder mandates, and legal holds collide.

## Local verification

```bash
npm run check
npm test
npm run demo
```
