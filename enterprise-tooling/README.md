# Enterprise Tooling

This module is a self-contained implementation for SCIBASE.AI issue #19. It models enterprise admin dashboards, institutional APIs/webhooks, and export pipelines for research organizations.

## What It Covers

- Organization-wide admin dashboard with project, storage, compute, submission, review, and reproducibility metrics.
- Contributor analytics with activity and collaboration signals.
- Compliance tracking for funder mandates, open-access status, reproducibility scores, and internal tags.
- Secure REST API catalog for institutional repositories, LMS, ELN, inventory, HRIS, and ORCID-style integrations.
- Webhook payloads for project publication and review events.
- Export pipelines for Zenodo, PubMed, arXiv, bioRxiv, journal, and funder-style handoffs.
- Formatting plugin metadata that preserves DOI, ORCID, citations, and version history.

## Run Locally

```bash
cd enterprise-tooling
npm test
npm start
```

Then open `http://localhost:4132`.

## API Surface

- `GET /api/dashboard`
- `GET /api/enterprise/analytics`
- `GET /api/enterprise/catalog`
- `GET /api/enterprise/webhook-preview`
- `GET /api/enterprise/export-preview?target=Zenodo&format=JATS`

## Requirement Mapping

- Admin dashboards: implemented by `buildAdminDashboard`.
- Contributor analytics, usage stats, productivity metrics, compliance tracking, and tags: returned in the dashboard payload.
- API and webhooks: implemented by `buildRestApiCatalog` and `createWebhookEvent`.
- Institutional integrations: represented by DSpace, Canvas, Benchling, and ORCID sync metadata.
- Export pipelines: implemented by `buildExportPipeline`.
- Formatting plugins and preserved metadata: represented by pipeline plugin lists and preserved DOI/ORCID/citation/version fields.

## Verification

```bash
npm test
node src/server.js
```

Optional smoke checks:

```bash
curl -s http://localhost:4132/api/dashboard
curl -s http://localhost:4132/api/enterprise/webhook-preview
curl -s "http://localhost:4132/api/enterprise/export-preview?target=Zenodo&format=JATS"
```

Demo artifacts are committed under `docs/demo/`, including `dashboard.png` and `enterprise-tooling-demo.mp4`.
