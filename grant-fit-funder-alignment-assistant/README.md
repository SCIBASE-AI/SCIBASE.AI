# Grant-Fit Funder Alignment Assistant

This focused slice adds a deterministic grant-fit and funder-alignment assistant for the AI-Powered Research Assistant Suite in issue #16.

The assistant converts a manuscript or proposal packet into a reviewer-ready funding fit report. It checks whether the work clearly maps to funder priorities, open-science artifacts, ethics readiness, budget constraints, impact statements, and evidence-backed claims before a researcher submits the application.

## What it does

- Scores funder priority coverage across aims, impact statements, beneficiaries, and artifacts.
- Verifies open artifact readiness for notebooks, protocols, model cards, and dashboards.
- Checks budget cap fit and missing budget justifications.
- Flags ethics, consent, IRB, and data protection readiness gaps.
- Blocks unsupported claims that lack evidence IDs.
- Produces JSON, Markdown, and SVG reviewer packets.

## Run it

```bash
node grant-fit-funder-alignment-assistant/test.js
node grant-fit-funder-alignment-assistant/demo.js
```

Generated outputs are written to `grant-fit-funder-alignment-assistant/reports/`, including a short `demo.webm` visual walkthrough.

## Why this is distinct

This is not another broad assistant, protocol trace, evidence-grounding assistant, statistics reviewer, gap planner, rebuttal pack, ethics/data checker, citation-context reconciler, reporting-guideline checker, benchmark-leakage auditor, figure/table consistency checker, analysis-variable provenance checker, domain-template selector, or living-literature monitor. It focuses specifically on pre-award funder fit and reviewer-facing funding readiness.
