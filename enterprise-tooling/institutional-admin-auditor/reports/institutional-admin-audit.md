# Institutional Admin Audit

Tenant: Northstar University Research Office (tenant-northstar-university)
Decision: block-enterprise-rollout
Risk score: 100
Admins: 2
Webhooks: 1
Export pipelines: 1
Audit digest: ad0b23a6aa1a8579

## Findings
- [blocker] Institution tenant lacks an owner admin: tenant-northstar-university has no owner admin role.
  Action: Assign an accountable owner admin before enabling enterprise controls.
- [high] Admin account does not enforce MFA: ops@example.edu role=admin has MFA disabled.
  Action: Require MFA for all enterprise admins before exposing organization-wide controls.
- [medium] Least-privilege role review is missing: tenant-northstar-university has no recorded role-policy review.
  Action: Schedule periodic role reviews for admins, lab leads, reviewers, and export operators.
- [medium] Institution admin dashboard is missing a required widget: tenant-northstar-university lacks contributorAnalytics.
  Action: Enable the required admin dashboard widget before enterprise rollout.
- [high] Institution admin dashboard is missing a required widget: tenant-northstar-university lacks complianceTracking.
  Action: Enable the required admin dashboard widget before enterprise rollout.
- [medium] Institution admin dashboard is missing a required widget: tenant-northstar-university lacks exportPipelineHealth.
  Action: Enable the required admin dashboard widget before enterprise rollout.
- [medium] Admin dashboard data freshness exceeds target: tenant-northstar-university freshness=180 minutes.
  Action: Refresh usage, compliance, and project metrics at least hourly for enterprise reporting.
- [high] Enterprise API lacks required project read scope: tenant-northstar-university scopes=users:read.
  Action: Add least-privilege project read scope for institutional reporting integrations.
- [medium] Enterprise API keys lack rotation policy: tenant-northstar-university has no API key rotation interval.
  Action: Set an API key rotation interval and notify integration owners before expiry.
- [blocker] Webhook lacks signature verification: https://repo.example.edu/hooks/scibase has no signing secret configured.
  Action: Configure signed webhooks before sending project, publication, or compliance events.
- [medium] Webhook lacks retry policy: https://repo.example.edu/hooks/scibase has no retry attempts configured.
  Action: Add retry/backoff so institutional systems do not miss critical events.
- [high] Export pipeline destination or format is incomplete: pubmed-export destination=PubMed Central format=missing.
  Action: Configure destination and format before one-click institutional exports are enabled.
- [blocker] Export pipeline requires PII scrub but it is disabled: pubmed-export requires PII scrub for PubMed Central.
  Action: Enable PII scrub and add an export reviewer before routing data to external systems.
- [high] Export pipeline does not have a passing dry run: pubmed-export dryRun=failed.
  Action: Run a dry export and resolve validation errors before enabling production exports.
- [blocker] Enterprise audit logging is disabled: tenant-northstar-university lacks audit logging for admin and export actions.
  Action: Enable immutable audit logs before enterprise admin tooling is activated.
- [medium] Funder mandate tracking is disabled: tenant-northstar-university cannot surface open access or reproducibility mandate compliance.
  Action: Enable funder mandate tracking for compliance dashboard coverage.
- [medium] Enterprise SLA profile is incomplete: tenant-northstar-university tier=missing responseHours=missing.
  Action: Attach the contracted SLA tier and response window to the tenant profile.
- [blocker] Data-processing agreement is required but missing: tenant-northstar-university contract requires DPA with no agreement ID.
  Action: Collect the DPA before enabling cross-system data export or analytics.

## Safety
- Synthetic enterprise tenant only; no customer data, institution systems, API keys, webhook secrets, contracts, or external APIs.
