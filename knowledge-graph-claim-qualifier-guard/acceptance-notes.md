# Acceptance Notes

## What To Review

- `index.js` implements claim qualifier checks for scientific graph edges.
- `sample-data.js` includes risky causal overclaim, negative-result polarity, and clean controlled-experiment examples.
- `test.js` validates blocker, warning, clean-pass, and report-rendering behavior.
- `demo.js` generates the curator packet and visual demo artifact.

## Verification

```bash
node knowledge-graph-claim-qualifier-guard/test.js
node knowledge-graph-claim-qualifier-guard/demo.js
node --check knowledge-graph-claim-qualifier-guard/index.js
node --check knowledge-graph-claim-qualifier-guard/sample-data.js
node --check knowledge-graph-claim-qualifier-guard/test.js
node --check knowledge-graph-claim-qualifier-guard/demo.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of default=noprint_wrappers=1 knowledge-graph-claim-qualifier-guard/reports/demo.mp4
```

## Expected Demo Result

The risky packet returns `hold_claim_edges` with blockers for causal overclaim, missing negative-result polarity, and unsupported recommendation language. The clean packet returns `graph_edges_ready`.
