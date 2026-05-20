# Project Funding Attribution Guard

A focused User & Project Management slice for checking whether a research project has valid funding-source, institution, collaborator, and citation attribution before publication or public profile exposure.

The module is deterministic, dependency-free, and uses synthetic data only. It does not handle payout routing, billing, payment rails, or private financial details.

## What It Checks

- Funding sources linked to project metadata and required acknowledgements.
- Institution ownership and collaborator affiliation consistency.
- Grant IDs and sponsor terms required for public project pages.
- Public/private profile exposure against grant and institution requirements.
- Citation metadata readiness for DOI/project exports.
- Audit evidence for project-level attribution decisions.
- Reviewer-facing remediation actions before publication.

## Usage

```bash
node project-funding-attribution-guard/test.js
node project-funding-attribution-guard/demo.js
```

The demo writes:

- `reports/attribution-audit.json`
- `reports/reviewer-packet.md`
- `reports/attribution-summary.svg`

The PR includes a short demo video at `reports/demo.mp4`.

## Maintainer-Friendly Notes

- No external services, credentials, network calls, or package installs.
- All fixtures are synthetic and intentionally small.
- The guard complements identity/access modules by focusing specifically on project-level funding and institutional attribution readiness.
