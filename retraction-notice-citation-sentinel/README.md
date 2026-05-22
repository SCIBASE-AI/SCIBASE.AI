# Retraction Notice Citation Sentinel

This module is a focused slice for SCIBASE.AI issue #16. It screens research assistant peer-review packets for publication notices that can invalidate or weaken cited evidence before claims are shown to authors, reviewers, funders, or journals.

The implementation is dependency-free, deterministic, and uses synthetic fixture data only. It does not call external citation databases, publishers, model APIs, or network services.

## What It Checks

- Retracted or withdrawn primary evidence that must quarantine dependent claims.
- Expressions of concern that require reviewer-visible caveats and independent support.
- Major corrections that change effect-size or evidence wording.
- Superseded preprints that should be replaced by final publications.
- Claim-level release decisions so unsafe assistant language is held before publication.
- Research-gap prompts for replacing compromised evidence or rerunning corrected analyses.

## Issue #16 Mapping

- Auto peer review reports: generated reviewer actions, claim decisions, and Markdown packet.
- Claims vs. evidence alignment: each claim is linked to publication-notice status for its cited evidence.
- Missing citations or scope misalignment: superseded preprints and notice-affected claims receive replacement actions.
- Reproducibility checker support: the report includes deterministic notice fingerprints, no-network metadata, and a stable audit digest.
- Research gap finder: blocked claims produce replacement-evidence and independent-replication prompts.
- Adaptive review use: the sample project is computational biology, but the checker operates on generic claim/reference metadata.

## Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/retraction-notice-packet.json`
- `reports/retraction-notice-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Safety Notes

- Synthetic project data only.
- No credentials, private data, API keys, payment data, or wallet material.
- No live publication database lookups.
- No external network calls.
