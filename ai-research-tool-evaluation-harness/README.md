# AI Research Tool Evaluation Harness

This module adds a focused quality gate for the AI-Assisted Research Tools MVP. It does not call a live model. Instead, it evaluates proposed summarizer, peer-review, and citation-tool outputs against deterministic manuscript evidence so reviewers can see whether AI outputs are grounded, compliant, and insertion-ready.

## What it checks

- Summary mode contracts for abstract, executive, and layperson outputs
- Evidence-span coverage for findings, implications, next steps, and recommendations
- Peer-review diagnostics for statistical, ethics, data availability, clarity, and similarity risks
- Citation recommendations for claim coverage, confidence, DOI metadata, and APA/Nature formatting
- Actionable quality gates with blocker/warning severities, readiness score, and audit digest

## Run locally

```bash
npm run check
npm test
npm run demo
```

The sample bundle intentionally flags one unsupported citation gap, one missing data availability statement, one p-value interpretation risk, and one layperson-summary jargon issue.

## Demo video

The reviewer demo is at `docs/research-tool-evaluation-demo.mp4`. It shows a terminal-style walkthrough of `npm run check`, `npm test`, and `npm run demo` using the current module output.
