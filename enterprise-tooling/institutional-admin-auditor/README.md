# Institutional Admin Auditor

This module adds a deterministic, dependency-free enterprise tooling auditor for SCIBASE issue #19. It checks whether an institution tenant has the admin controls, dashboards, APIs, webhooks, export pipelines, compliance settings, and SLA metadata needed for enterprise rollout.

## Scope

- Owner/admin role coverage, MFA, and least-privilege review checks
- Required dashboard widgets for projects, contributors, usage, compliance, and export health
- Enterprise API enablement, required scopes, and API key rotation
- Signed webhooks and retry policy
- Export pipeline destination, format, PII scrub, and dry-run checks
- Audit logging, funder mandate tracking, SLA, and DPA readiness

All fixtures are synthetic. The module does not access customer data, institution systems, API keys, webhook secrets, contracts, or external APIs.

## Run

```bash
node enterprise-tooling/institutional-admin-auditor/test.js
node enterprise-tooling/institutional-admin-auditor/demo.js
node enterprise-tooling/institutional-admin-auditor/make-demo-video.js
```

Generated enterprise audit artifacts are written to `reports/`.
