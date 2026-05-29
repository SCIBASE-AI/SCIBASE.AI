# Enterprise Contract Drift Guard

This module is a focused Enterprise Tooling slice for institutional integrations. It reviews proposed API, webhook, and export contract changes before they reach external systems such as DSpace, Invenio, Canvas, Moodle, ELNs, lab inventory tools, HRIS, and ORCID sync jobs.

It is intentionally separate from broad enterprise dashboards, webhook delivery, webhook replay, webhook payload redaction, SCIM deprovisioning, repository sync SLA checks, LMS roster passback, connector certification, vendor DPA review, data residency, and admin alert escalation work.

## What it checks

- Removed required fields in export and webhook payloads
- Type changes that would break pinned enterprise consumers
- Narrowed enum values
- Deprecation windows below 90 days
- Email redaction and internal-note leakage policy
- Versioned remediation actions for institutional integration owners

## Run

```bash
node enterprise-contract-drift-guard/test.js
node enterprise-contract-drift-guard/demo.js
node enterprise-contract-drift-guard/render-video.js
```

Outputs are written to `enterprise-contract-drift-guard/reports/`.

## Safety

All data is synthetic. The module does not call institutional repositories, LMS platforms, ELNs, HRIS tools, ORCID, webhooks, private APIs, credentials, or production SCIBASE services.
