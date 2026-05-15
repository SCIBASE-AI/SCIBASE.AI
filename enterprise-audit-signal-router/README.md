# Enterprise Audit Signal Router

A dependency-free Enterprise Tooling milestone for SCIBASE issue #19. It gives institutional admins a deterministic way to turn project activity into dashboard metrics, signed integration events, compliance alerts, and export packets for repositories, journals, and funders.

## What is included

- `src/index.js` — core library for workspace normalization, dashboard aggregation, compliance checks, REST/API catalog generation, signed webhook routing, export packet creation, and an end-to-end enterprise brief.
- `src/cli.js` — CLI demo that reads the sample fixture and prints an audit summary.
- `sample/enterprise-fixture.json` — representative university/corporate R&D workspace with public/private projects, contributors, API clients, mandates, DOI/ORCID/citation metadata, and events.
- `test/enterprise-audit-signal-router.test.js` — Node test coverage for every issue capability.
- `docs/demo.svg` and `docs/demo.mp4` — short visual demo artifacts.

## Requirement mapping

| Issue #19 capability | Implementation evidence |
| --- | --- |
| Admin dashboards for organization-wide project oversight | `buildAdminDashboard()` reports total/public/private projects, projects by department/lab, custom tags, and dashboard hash. |
| Contributor analytics, activity heatmaps, top researchers, and cross-lab collaborations | `contributorAnalytics` ranks researchers, computes activity heat, and records cross-lab collaboration counts. |
| Usage stats for logins, submissions, storage, and compute | `usageStats` aggregates logins, submissions, storage GB, and compute hours across the workspace. |
| Productivity metrics for lab output, AI reviews, and peer reviews | `productivityMetrics` tracks projects per lab, AI reviews generated, and peer reviews completed. |
| Compliance tracking for funder mandates, open access, and reproducibility scores | `evaluateCompliance()` flags missing funder/open-access/reproducibility evidence and emits compliance labels. |
| Secure RESTful API integration with repositories, LMS, ELNs, HRIS, and ORCID | `buildApiCatalog()` defines scoped REST endpoints, integration readiness for DSpace/Invenio/Canvas/Moodle/ELN/HRIS/ORCID, and security controls. |
| Webhooks for project creation, publication, and review events | `routeEnterpriseEvents()` creates HMAC-signed deliveries with deterministic payloads and destination routing. |
| Export pipelines for preprints, indexed repositories, journals, and funders | `buildExportPacket()` prepares arXiv, bioRxiv, Zenodo, PubMed Central, NIH RePORTER, UKRI, or custom packets. |
| Formatting plugins with DOI, ORCID, citation, and version preservation | Export packets include manuscript formats, DOI, ORCID list, citation text, tags, funder mandates, version history, files, and a packet hash. |

## Run verification

```bash
cd enterprise-audit-signal-router
npm run check
```

Expected result: six Node tests pass, then the CLI demo prints the institution, project visibility counts, top researcher, compliance risk count, webhook delivery count, export packet count, and audit hash.

## Demo output

```text
Enterprise Audit Signal Router Demo
Institution: Midlands Research Office
Projects: 2 (1 public / 1 private)
Top researcher: Ada Kim
Compliance risks: 1
Webhook deliveries: 16
Export packets: 2
Audit hash: <deterministic hash prefix>
```

## AI-assisted disclosure

This contribution was produced with AI assistance and manually reviewed/verified before submission.
