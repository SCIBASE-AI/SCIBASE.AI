# Requirement Map

## Admin dashboards

- `buildAdminDashboard` summarizes hosted projects, storage use, open-science compliance, export queue health, and top lab activity.
- Sample data includes public and institutional projects so dashboard rates and blocked export counts are visible.

## API and webhooks

- `listApiCatalog` documents dashboard, target, package, compliance, webhook, and plugin surfaces.
- `buildWebhookEvents` creates deterministic event IDs and idempotency keys for export-ready and blocked package events.

## Export pipelines

- `buildExportPackage` packages project files for Zenodo, PubMed Central, and funder-reporting targets.
- Each package records required files, hashes, metadata standard, DOI, authors, reproducibility score, and readiness.

## Formatting plugins

- `listFormattingPlugins` maps JATS, DataCite, and funder evidence outputs to the relevant targets and preserved metadata.

## Compliance and governance

- `buildComplianceManifest` aggregates every requested export package and reports ready vs blocked status for institutional oversight.
