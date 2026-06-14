# Preregistration consistency assistant

This module checks whether AI review output should be released when a study has a preregistration plan.

It focuses on one AI research assistant slice: spotting preregistration conflicts before the assistant gives authors reviewer-facing guidance. It does not call external registries, run AI models, or process private manuscripts.

## What it checks

- preregistration id
- primary outcome reporting
- unlogged primary outcome changes
- unexplained analysis plan changes
- unplanned subgroup claims
- sample size shortfalls
- secondary outcome promotion
- missing null result discussion

## Run it

```bash
node preregistration-consistency-assistant/test.js
node preregistration-consistency-assistant/demo.js
```

The demo writes JSON and Markdown artifacts to `artifacts/`.
