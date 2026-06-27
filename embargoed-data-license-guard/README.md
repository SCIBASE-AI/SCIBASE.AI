# Embargoed Data License Guard

This module is a focused Revenue Infrastructure slice for issue #20. It checks
whether an anonymized research metadata or data-licensing export can be released
to an institutional, government, or market-intelligence customer.

It is intentionally self-contained:

- no payment processor calls
- no external APIs
- no credentials
- no private research content
- synthetic packets only

## What It Checks

- Embargo windows have ended or the license has a valid early-access grant.
- Exclusive licenses are not released to the wrong customer.
- Cohort size is large enough for anonymized export.
- Consent coverage meets the license policy.
- License tier permits the requested export type.
- Required attribution, redaction, and data-processing terms are present.
- Deliverables are not stale relative to the license snapshot.

## Run

```bash
npm test
npm run demo
```

The demo writes reviewer artifacts under `artifacts/`:

- `demo-output.json`
- `demo-report.md`
- `release-summary.svg`

## Requirement Mapping

Issue #20 calls out monetizing structured, anonymized usage and research
metadata through licensing APIs and analytics. This guard focuses on the release
control before such a licensing export is delivered or invoiced.

| Issue requirement | Covered by |
| --- | --- |
| Data licensing models for institutional and government customers | customer/license packet fields |
| Anonymized metadata, never private content | cohort and redaction checks |
| API/dashboard licensing options | `exportType` tier entitlement checks |
| Predictable revenue and compliance-safe delivery | deterministic release decisions |
