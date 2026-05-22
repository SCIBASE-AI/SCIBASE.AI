# Citation Metadata Integrity Assistant

This module is a focused slice for SCIBASE.AI issue #13. It validates candidate references before the AI citation tool inserts them into a manuscript or bibliography.

The implementation is dependency-free, deterministic, and uses synthetic fixture data only. It does not call DOI registries, PubMed, arXiv, Crossref, model APIs, or network services.

## What It Checks

- DOI, arXiv, PMCID, and URL format readiness.
- Candidate metadata against synthetic canonical records.
- Title, publication year, author surname, and canonical URL mismatches.
- Duplicate bibliography rows that should be merged before insertion.
- Safe insert, revise, merge, and defer actions for citation-tool output.

## Issue #13 Mapping

- AI Citation Tool: validates references before one-click insertion.
- Auto-formatting support: returns canonical Nature-style citation text for clean or corrected records.
- Similar/recommended paper safety: malformed or mismatched references are deferred before recommendation output is shown.
- Peer Review Aid: emits reviewer-ready metadata actions for bibliography cleanup.
- Paper Summarizer support: keeps cited summary outputs tied to stable, canonical references.

## Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/citation-metadata-packet.json`
- `reports/citation-metadata-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Safety Notes

- Synthetic citation metadata only.
- No credentials, private data, API keys, payment data, or wallet material.
- No live DOI, PubMed, arXiv, Crossref, publisher, or citation database lookups.
- No external network calls.
