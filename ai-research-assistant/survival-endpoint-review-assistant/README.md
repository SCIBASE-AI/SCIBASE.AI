# Survival Endpoint Review Assistant

This module adds a focused survival and time-to-event review assistant for the AI-Powered Research Assistant Suite in issue #16.

It reviews synthetic manuscript packets before peer-review output is shown and flags common survival-analysis risks:

- Immortal-time bias from post-baseline exposure assignment.
- Missing or contradicted proportional-hazards evidence.
- Arm-level censoring imbalance.
- Low events-per-variable model support.
- Competing-risk endpoints analyzed with ordinary Kaplan-Meier or Cox methods.
- Follow-up that is shorter than the event window claimed in the manuscript.
- Missing censoring tables when attrition is material.

The output is deterministic and credential-free. It emits reviewer findings, reproducibility actions, research-gap prompts, and JSON/Markdown/SVG artifacts using only local synthetic data.

## Files

- `assistant.js` - deterministic review engine and report renderers.
- `data/survival-study-packets.json` - synthetic survival-analysis manuscript packets.
- `demo.js` - writes reviewer artifacts into `artifacts/`.
- `make-demo-video.js` - renders a short dependency-free frame sequence and encodes `artifacts/demo.mp4` with local `ffmpeg`.
- `test.js` - dependency-free regression checks using Node's built-in `assert`.

## Verification

```sh
node ai-research-assistant/survival-endpoint-review-assistant/test.js
node ai-research-assistant/survival-endpoint-review-assistant/demo.js
node ai-research-assistant/survival-endpoint-review-assistant/make-demo-video.js
```

## Scope Boundary

This is distinct from the existing broad assistant, Bayesian prior, structured abstract, unit/dimension, randomization/blinding, literature freshness, assay calibration, image integrity, and external-validity submissions. It focuses specifically on whether time-to-event claims are supported by survival endpoint definitions, censoring evidence, proportional-hazards checks, and exposure-time modeling.
