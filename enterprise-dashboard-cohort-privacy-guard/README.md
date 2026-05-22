# Enterprise Dashboard Cohort Privacy Guard

This module adds a focused Enterprise Tooling slice for issue #19: privacy review for organization-wide admin dashboard metrics before they are shown or exported.

It evaluates synthetic institutional dashboard widgets for:

- small-cohort suppression with k-anonymity thresholds
- named contributor heatmap re-identification risk
- private or invitation-only project label masking
- cross-lab and department rollup minimums
- direct identifier blocking
- sensitive initiative tag masking
- raw CSV, webhook, and external BI export blocks when suppressed rows are present

The module is dependency-free and uses only synthetic fixtures. It does not call live analytics systems, identity providers, export services, billing systems, or third-party APIs.

## Run

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts under `reports/`:

- `dashboard-privacy-packet.json`
- `dashboard-privacy-report.md`
- `summary.svg`
- `demo.mp4`

## Scope

This is intentionally distinct from broad admin dashboards, export pipelines, webhook replay ledgers, identity provisioning drift, retention/legal hold, data residency, SLA, secret rotation, quotas, API change governance, connector certification, incident response, funder exports, model governance, initiative tags, policy exceptions, IRB consent, SCIM deprovisioning, repository deposit reconciliation, notification escalation, cost allocation, LMS passback, payload redaction, and vendor DPA review.

It covers the privacy trust boundary for aggregated dashboard metrics: what can be safely displayed or exported to institutional admins without exposing small groups, private project activity, or direct identifiers.
