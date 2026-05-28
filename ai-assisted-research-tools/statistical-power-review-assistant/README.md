# Statistical Power Review Assistant

This module adds a deterministic, dependency-free review assistant for SCIBASE issue #13. It evaluates whether manuscript claims have enough statistical power and sample-size evidence before AI research summaries endorse them.

## Scope

- Planned power and minimum target power
- Sample-size justification and effect-size source fit
- Effective sample size after attrition and exclusions
- Subgroup and event-count adequacy
- Primary/secondary endpoint alignment for headline claims
- Reviewer remediation actions and audit digests

All fixtures are synthetic. The module does not use patient data, private manuscripts, live statistics services, credentials, or external APIs.

## Run

```bash
node ai-assisted-research-tools/statistical-power-review-assistant/test.js
node ai-assisted-research-tools/statistical-power-review-assistant/demo.js
node ai-assisted-research-tools/statistical-power-review-assistant/make-demo-video.js
```

Generated reviewer artifacts are written to `reports/`.
