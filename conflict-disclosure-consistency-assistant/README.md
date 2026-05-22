# Conflict Disclosure Consistency Assistant

This module adds a focused pre-submission assistant slice for the AI-Powered Research Assistant Suite. It checks whether manuscript, project, registry, funder, data-provider, and citation metadata agree with the disclosures that will be shown to reviewers.

It is intentionally self-contained and uses synthetic sample data only. No external services, credentials, model calls, payment rails, or private data are required.

## What It Checks

- Missing competing-interest statements.
- Author affiliations that overlap funders or data providers without author-level disclosure.
- Funders missing from the manuscript funding statement.
- Commercial sponsor roles that are not described.
- Trial registry funding mismatches.
- Restricted data-provider relationships missing from the reviewer packet.
- Related-party primary-support citations without context.
- Incomplete reviewer disclosure sections.

## Validation

```bash
npm run check
npm test
npm run demo
```

`npm run demo` writes reviewer artifacts to `reports/`.
