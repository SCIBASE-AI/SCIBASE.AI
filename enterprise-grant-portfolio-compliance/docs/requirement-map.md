# Enterprise Grant Portfolio Compliance Requirement Map

| Issue #19 capability | Implementation evidence |
| --- | --- |
| Organization-wide dashboard for admins | `evaluatePortfolio()` returns `summary`, `adminMetrics.byDepartment`, `adminMetrics.byFunder`, and `topRisks` for a research office portfolio view. |
| Compliance tracking for funder mandates and open access status | `src/grant-portfolio-compliance.js` evaluates open access, repository deposit, data management plan, DOI, ORCID, and report due-date obligations. |
| Export pipelines to grant and funder portals | `buildExportManifest()` produces ready, blocked, and review grant sets plus required evidence fields for institutional export workflows. |
| Secure API and webhook support | `signEvent()` creates deterministic SHA-256 digests and HMAC signatures for downstream webhook/event delivery without external credentials. |
| Research operations analytics | The module calculates compliance scores, risk levels, blockers, warnings, action owners, and top-risk grants from synthetic portfolio records. |
| Reviewer-ready proof | `npm run check`, `npm test`, `npm run demo`, `docs/demo.svg`, and `docs/demo.gif` provide local verification and a short demo artifact. |

## Non-overlap Notes

This slice focuses on grant-portfolio obligations and funder mandate certification. It does not reimplement broad admin dashboards, export package builders, webhook replay ledgers, identity provisioning drift, legal holds, or data residency controls submitted in earlier issue #19 PRs.
