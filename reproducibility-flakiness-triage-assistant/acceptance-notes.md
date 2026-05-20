# Acceptance Notes

## Distinct Slice

This submission focuses on localizing reproducibility flakiness after repeated project runs. It does not implement another broad AI assistant, protocol/evidence trace, statistical-methods reviewer, research-gap planner, rebuttal pack, ethics/data-availability checker, citation-context reconciler, reporting-guideline checker, benchmark-leakage detector, figure/table checker, analysis-variable provenance assistant, domain template selector, living literature monitor, grant-fit assistant, or limitations disclosure assistant.

## Verification

Run from the repository root:

```bash
node reproducibility-flakiness-triage-assistant/test.js
node reproducibility-flakiness-triage-assistant/demo.js
node --check reproducibility-flakiness-triage-assistant/index.js
node --check reproducibility-flakiness-triage-assistant/sample-data.js
node --check reproducibility-flakiness-triage-assistant/test.js
node --check reproducibility-flakiness-triage-assistant/demo.js
git diff --check
```

Generated reviewer artifacts:

- `reproducibility-flakiness-triage-assistant/reports/reproducibility-flakiness-triage-report.json`
- `reproducibility-flakiness-triage-assistant/reports/reproducibility-flakiness-triage-packet.md`
- `reproducibility-flakiness-triage-assistant/reports/reproducibility-flakiness-triage.svg`
- `reproducibility-flakiness-triage-assistant/reports/demo.mp4` rendered from the generated review summary and decode-checked locally
