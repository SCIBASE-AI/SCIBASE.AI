# Manuscript Terminology Definition Assistant

This module is a focused AI-Assisted Research Tools slice for SCIBASE issue #13. It reviews manuscript terminology, acronym expansion, nomenclature style, citation term bindings, and lay-summary jargon before AI-generated peer-review packets, summaries, or citation recommendations are released.

The assistant checks:

- acronym expansion at first use, with stricter handling in title, abstract, summary, and lay-summary sections
- conflicting acronym expansions
- required reviewer-facing definitions for technical terms
- missing lay definitions for public-facing summaries
- preferred nomenclature and domain style drift
- citation recommendations that reference unknown or undefined terms
- generated summaries that include unexplained high-jargon terms

It is intentionally separate from broad research-tool suites, evidence-grounded summarizers, citation context or metadata guards, statistical review, protocol deviation review, lay-summary safety, and collaborative editor glossary/export checks. This slice focuses on terminology readiness inside AI peer-review and summary packets.

## Reviewer Path

```bash
npm run check
npm test
npm run demo
npm run verify-video
```

Generated reviewer artifacts:

- `reports/clean-terminology-packet.json`
- `reports/risky-terminology-packet.json`
- `reports/terminology-review-report.md`
- `reports/summary.svg`
- `reports/demo-script.txt`
- `reports/demo.mp4`

## Safety

All fixtures are synthetic. The module does not call uploaded manuscript stores, private corpora, citation indexes, external AI APIs, credential stores, payment systems, or external services.
