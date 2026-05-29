# Institutional Repository Sync SLA Guard

This is a focused Enterprise Tooling slice for SCIBASE export pipelines. It evaluates institutional repository sync jobs before they are released to external systems such as Zenodo, PubMed Central, arXiv, Invenio, DSpace, funder portals, or institutional archives.

The module uses synthetic reviewer scenarios only. It does not call external repositories, APIs, webhooks, identity providers, payment systems, live projects, private user data, credentials, or tokens.

## What It Checks

- Funder mandate deadlines and overdue sync jobs.
- Metadata completeness, DOI preservation, ORCID coverage, and artifact hash pins.
- Embargo holds before export.
- Backlog/retry risk and webhook delivery visibility for enterprise admins.
- Deterministic audit digests and escalation routes.

## Run

```bash
node institutional-repository-sync-sla-guard/test.js
node institutional-repository-sync-sla-guard/demo.js
node institutional-repository-sync-sla-guard/render-video.js
```

Generated reviewer artifacts are written to `institutional-repository-sync-sla-guard/reports/`.

## Scope Boundary

This slice is distinct from existing #19 work around enterprise dashboards, institutional admin auditing, generic API/webhook integrations, API rate limiting, webhook delivery, accessibility, repository/archive export, artifact hosting, and broad integration modules. It focuses specifically on SLA and compliance governance for institutional repository sync backlogs.
