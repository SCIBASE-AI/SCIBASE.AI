# Research Assistant Prompt Safety Guard

This module adds a focused safety gate for the AI-Powered Research Assistant Suite in issue #16. It protects auto peer-review and reproducibility packets from two failure modes that are specific to AI research assistants:

- hostile or hidden manuscript/supplement instructions that try to steer the assistant or reveal private prompts
- unsupported assistant-generated review claims, missing evidence anchors, and hallucinated citations before a reviewer packet is shown

The implementation is dependency-free and uses synthetic data only. It does not call external APIs, read private files, or require credentials.

## Run

```bash
node research-assistant-prompt-safety-guard/test.js
node research-assistant-prompt-safety-guard/demo.js
```

The demo writes:

- `reports/prompt-safety-packet.json`
- `reports/prompt-safety-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Scope

The guard evaluates manuscript text, supplements, declared claims, artifacts, citation corpus entries, and draft assistant review findings. It emits:

- prompt-injection findings from visible and hidden manuscript channels
- evidence-support checks for assistant review findings
- blocker/warning/action summaries for reviewer packet readiness
- a deterministic Markdown reviewer report and SVG summary

This is intentionally separate from prior issue #16 slices such as broad assistant suites, protocol/evidence traces, statistics review, citation context reconciliation, benchmark leakage audits, figure/table consistency, uncertainty calibration, grant-fit review, limitations disclosure, and supplement readiness.
