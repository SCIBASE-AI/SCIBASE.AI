# Enterprise Export Pipeline

Self-contained implementation for SCIBASE Enterprise Tooling issue #19. The module models the enterprise export layer that institutions need to move research outputs into repositories, preprint servers, journal systems, and funder portals while preserving compliance evidence.

## What It Covers

- Export targets for institutional repositories, arXiv, PubMed Central, Zenodo, journal submissions, NIH RePORTER, and Horizon Europe portals.
- Deterministic package manifests with artifact selection, checksums, DOI/ORCID/citation metadata, version history, and formatting plugin hints.
- Compliance evidence for funder mandates, open access status, data availability, ethics review, retention, consent, and audit review.
- Signed webhook-style integration events and retry/dead-letter handoff metadata.
- Local API endpoints for reviewers to inspect targets, packages, compliance evidence, webhook events, and an admin dashboard.

The implementation avoids external accounts, API keys, and network services. All behavior is driven by deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4349 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4349/api/targets
curl -fsS 'http://localhost:4349/api/export?target=zenodo'
curl -fsS 'http://localhost:4349/api/compliance?target=nih-reporter'
curl -fsS 'http://localhost:4349/api/webhook?target=journal-submission'
curl -fsS http://localhost:4349/api/dashboard
```

## Demo Flow

1. Open `/api/dashboard` to see the institutional admin view across all export targets.
2. Open `/api/export?target=journal-submission` to inspect one-click package contents, formatting plugin selection, checksums, and next actions.
3. Open `/api/compliance?target=nih-reporter` to verify funder evidence and audit readiness.
4. Open `/api/webhook?target=zenodo` to see the signed event payload an enterprise integration would deliver.

See `docs/requirement-map.md` for the issue requirement mapping.
