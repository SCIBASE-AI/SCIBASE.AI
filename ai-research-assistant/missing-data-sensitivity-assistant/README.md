# Missing Data Sensitivity Assistant

Focused slice for SCIBASE issue #16: an AI-powered peer-review assistant that checks manuscript analysis packets for missing-data, attrition, and imputation risks before reviewer-ready claims are shown.

## What it checks

- Arm-level attrition imbalance and high overall missingness.
- Primary outcome missingness without a prespecified handling plan.
- Weak or single-imputation methods used for confirmatory claims.
- Complete-case estimates that diverge from imputed or sensitivity estimates.
- Missing MNAR sensitivity analysis when missingness is outcome-related.
- Unexplained dropout reasons and claim wording that overstates incomplete evidence.

The module is deterministic and dependency-free. It uses synthetic study packets only; it does not call external APIs, connect to live projects, or inspect private research data.

## Files

- `index.js` - review engine and report/SVG renderers.
- `sample-data.js` - synthetic high-risk and low-risk manuscript packets.
- `test.js` - local regression tests.
- `demo.js` - generates JSON, Markdown, and SVG reviewer artifacts.
- `make-demo-video.js` - renders a short H.264 demo video from generated SVG frames.

## Validation

```bash
node ai-research-assistant/missing-data-sensitivity-assistant/test.js
node ai-research-assistant/missing-data-sensitivity-assistant/demo.js
node ai-research-assistant/missing-data-sensitivity-assistant/make-demo-video.js
```
