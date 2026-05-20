# Requirements Map

## Issue #19: Enterprise Tooling

| Requirement | Coverage |
| --- | --- |
| Organization-wide admin dashboards | `buildDashboardAttributionMonitor` produces admin-facing metrics and review packets. |
| Contributor analytics and top researchers | `buildMetrics` rolls events into canonical researcher credits. |
| Cross-lab collaborations | `detectCollaborationInflation` flags repeated collaboration-pair inflation. |
| Usage stats and productivity metrics | Event weights cover manuscript edits, dataset uploads, code commits, AI reviews, peer reviews, exports, and logins. |
| Compliance tracking and visibility boundaries | `visibleToAdmin` and private-boundary anomalies keep restricted/private projects out of unauthorized dashboards. |
| ORCID/HRIS-style identity alignment | `canonicalResearcherId` uses identity links to de-duplicate ORCID/GitHub-style aliases. |
| Automation separation | `detectServiceAccountCredit` prevents service accounts from inflating researcher credit. |
| Tests and demo | `test.js` covers duplicate identity credit, service account credit removal, private-boundary leaks, collaboration inflation, usage spikes, reviewer Markdown, and visibility checks. `demo.js` emits JSON, Markdown, and SVG artifacts. |

## Acceptance Notes

- Synthetic data only; no external service calls or private data.
- No dependencies beyond the Node.js standard library.
- This is dashboard metric integrity, not another export, webhook, identity provisioning, quota, incident, or AI governance module.
- High-severity anomalies hold executive dashboards rather than silently adjusting numbers.
