# Requirement Map

Issue: SCIBASE-AI/SCIBASE.AI#16 - AI-Powered Research Assistant Suite

This module adds a narrow statistical methods review assistant. It is intentionally separate from the broad assistant-suite, protocol-trace, evidence-grounding, replication-planner, and rebuttal-response submissions already present on the bounty.

## Coverage

| Issue capability | This slice |
| --- | --- |
| Auto peer review reports | Generates reviewer-ready statistical findings, top risks, release recommendations, and required author actions. |
| Statistical or methodological red flags | Checks test choice, repeated-measures misuse, sample-size/power risk, multiple comparisons, p-value patterns, assumptions, missing-data plans, and outlier policies. |
| Claims vs. evidence alignment | Links manuscript claims to concrete analyses and verifies evidence artifacts are available and content-hashed. |
| Reproducibility confidence | Requires raw data, scripts, environment locks, deterministic seeds, and signed HMAC review packets. |
| Adaptive domain review | Sample docket spans neuroscience, clinical microbiome, and climate-science manuscripts with domain metadata. |

## Non-Overlap Notes

- Not a general research copilot or UI.
- Not another protocol trace or evidence-grounding module.
- Not a research-gap or replication planner.
- Not a rebuttal/response-pack generator.
- Focus is the statistical-methods reviewer portion of the AI assistant suite.

## Verification

```bash
npm run check
npm test
npm run demo
npm run demo:gif
```
