# Protocol Deviation Review Assistant

This module adds a deterministic, dependency-free protocol/preregistration deviation assistant for SCIBASE issue #13. It compares a manuscript against a preregistered protocol before AI-assisted research summaries treat claims as confirmatory.

## Scope

- Preregistration identifier and timing checks
- Planned vs reported endpoint alignment
- Endpoint hierarchy changes
- Unplanned analysis models and outcome-informed tuning
- Unplanned and outcome-aware exclusions
- Missing or late protocol amendments
- AI summary confidence and protocol caveat checks

All fixtures are synthetic. The module does not use patient data, private manuscripts, registry services, credentials, or external APIs.

## Run

```bash
node ai-assisted-research-tools/protocol-deviation-review-assistant/test.js
node ai-assisted-research-tools/protocol-deviation-review-assistant/demo.js
node ai-assisted-research-tools/protocol-deviation-review-assistant/make-demo-video.js
```

Generated protocol-deviation review artifacts are written to `reports/`.
