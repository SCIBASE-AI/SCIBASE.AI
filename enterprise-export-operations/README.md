# SCIBASE Enterprise Export Operations

This module is a credential-free enterprise tooling milestone for SCIBASE.AI. It focuses on institutional export operations: admin dashboard metrics, target-specific repository packages, compliance manifests, webhook delivery previews, API catalog entries, and formatting plugin metadata.

## What it covers

- Institution-wide admin metrics for projects, storage, open-science compliance, and export queue health.
- Export package manifests for Zenodo, PubMed Central, and funder reporting portals.
- Compliance evidence including required files, metadata standards, reproducibility scores, and package hashes.
- Webhook-safe event previews with deterministic event IDs and idempotency keys.
- API catalog and formatting plugin metadata for enterprise integrations.

## Run locally

```bash
npm test
npm run demo
node src/api.js package proj-climate-models zenodo
```

## Reviewer notes

The module is intentionally dependency-free and deterministic. It does not call external APIs, request credentials, or mutate remote systems. The sample data models enterprise workflows that can be wired into real adapters later.
