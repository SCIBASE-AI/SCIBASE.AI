# Requirements Map

Issue #19 asks for Enterprise Tooling across admin visibility, governance controls, APIs/webhooks, export pipelines, and compliance tracking. This module implements a distinct human-subjects governance gate.

| Requirement area | Coverage in this slice |
| --- | --- |
| Organization-wide governance | Scores projects for IRB, consent, DUA, retention, and export readiness. |
| Compliance tracking | Flags expired IRB approvals, missing guardian consent, consent-purpose gaps, DUA gaps, and retention review needs. |
| Export pipelines | Produces allow, hold-for-review, or block decisions for repository, journal, funder, and dashboard destinations. |
| API and webhook support | Emits deterministic signed webhook-ready events per project. |
| Admin dashboard inputs | Writes JSON and Markdown reviewer packets with top risks and action queues. |
| Enterprise interoperability | Models institutional repository, journal, funder, and internal dashboard export targets. |

This is intentionally separate from previous enterprise slices for funder reporting, incident response, data residency, dashboard attribution, quotas, secret rotation, API change governance, and connector certification.
