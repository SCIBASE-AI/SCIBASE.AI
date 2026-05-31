# ORCID Publication Claim Guard

Self-contained reviewer artifact for the User & Project Management bounty.

This module checks whether publications imported from ORCID, DOI metadata, or
profile sync jobs should be attached to a researcher profile automatically,
held for human review, or quarantined as a likely wrong-person claim.

## Scope

- Match imported publications to a researcher profile by ORCID, normalized name,
  affiliation, coauthor overlap, and DOI ownership.
- Detect ambiguous homonyms, DOI conflicts, retracted or withdrawn works, and
  weak evidence claims before they affect profile activity or reputation metrics.
- Produce deterministic audit evidence for reviewer and institution records.
- Use synthetic data only. No identity-provider calls, credentials, live ORCID
  records, private researcher data, or external APIs.

## Commands

```bash
node orcid-publication-claim-guard/test.js
node orcid-publication-claim-guard/demo.js
node orcid-publication-claim-guard/render-video.js
node --check orcid-publication-claim-guard/index.js
node --check orcid-publication-claim-guard/sample-data.js
node --check orcid-publication-claim-guard/test.js
node --check orcid-publication-claim-guard/demo.js
node --check orcid-publication-claim-guard/render-video.js
```

The demo writes reviewer-ready JSON, Markdown, SVG, and MP4 artifacts under
`orcid-publication-claim-guard/reports/`.
