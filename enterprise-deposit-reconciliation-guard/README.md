# Enterprise Deposit Reconciliation Guard

This module implements a post-export reconciliation guard for the Enterprise Tooling bounty. It verifies that repository deposit acknowledgements match the package SCIBASE intended to export before institutional dashboards, compliance reports, ORCID sync, or webhook consumers treat the export as complete.

The guard covers:

- DSpace, InvenioRDM, Zenodo, PubMed Central, or similar repository receipts
- DOI, handle, accession, version, license, access, embargo, and metadata preservation checks
- file-level checksum reconciliation for required exported artifacts
- ORCID and CRediT role preservation for contributor analytics
- funder open-access deadline checks
- webhook acknowledgement and signature validation
- reviewer-ready JSON, Markdown, and SVG evidence packets

## Commands

```sh
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts to `reports/`:

- `summary.json`
- `deposit-reconciliation-packet.md`
- `summary.svg`
- `demo.mp4` after the video generation step used for the PR
