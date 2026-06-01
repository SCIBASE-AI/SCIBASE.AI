# Enterprise Style Package Provenance Guard

This module adds a focused Enterprise Tooling export-pipeline guard for journal and funder formatting plugins. It validates synthetic style packages before institution-scale JATS, DOCX, or LaTeX exports are released.

The guard checks approved plugin versions, required export-format coverage, template checksum parity, citation-style parity, DOI/ORCID/version-history preservation, validation recency, reviewer signoff, generated output provenance digests, and private field leakage in style previews.

## Commands

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

`npm run demo` writes reviewer artifacts to `reports/`, including JSON packets, a Markdown report, an SVG summary, and a short H.264 MP4 demo.

Synthetic data only. No live repositories, journal systems, funder portals, credentials, private manuscripts, external APIs, payment systems, or payout-account settings are used.
