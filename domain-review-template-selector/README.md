# Domain Review Template Selector

This module covers the adaptive peer-review template slice of SCIBASE issue #16.

It classifies a manuscript's scientific domain from title, keywords, methods, and artifact metadata, then selects a domain-specific review template for the AI research assistant. The output combines domain review sections with claim/evidence alignment, reproducibility readiness, reviewer expertise, blockers, warnings, and a deterministic audit digest.

## What It Does

- Selects clinical, machine-learning, wet-lab biology, materials/chemistry, computational, or general-science review templates.
- Uses domain-specific review sections instead of a one-size-fits-all peer-review checklist.
- Checks manuscript, data, code, evidence anchors, environment, run command, and expected output readiness.
- Blocks review packets with unanchored or missing-evidence claims.
- Emits reviewer questions, expertise routing, warnings, blockers, and an audit digest.

## Run

```bash
node domain-review-template-selector/test.js
node domain-review-template-selector/demo.js
```
