# Reporting Guideline Compliance Assistant

This module is a focused AI peer-review aid for issue #13. It checks synthetic manuscript packets against reporting-guideline readiness rules for CONSORT, PRISMA, STROBE, and cross-guideline submission hygiene, then emits reviewer actions and citation recommendations.

## Three-Step Setup

1. `cd reporting-guideline-compliance-assistant`
2. `npm test`
3. `npm run demo`

## What It Produces

- `reports/reporting-guideline-packet.json`: deterministic machine-readable review packet
- `reports/reviewer-packet.md`: structured reviewer-ready Markdown
- `reports/summary.svg`: visual readiness summary
- `reports/demo-script.txt`: short demo walkthrough

## Requirement Mapping

- AI peer review aid: flags missing reporting-guideline details before submission.
- AI citation tool: recommends the relevant CONSORT, PRISMA, or STROBE citation when a checklist gap is found.
- Paper summarizer: emits abstract, executive, and layperson summaries of guideline readiness.
- Safety: uses synthetic data only, no external APIs, no credentials, and no private manuscripts.
