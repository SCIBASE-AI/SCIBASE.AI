# Unit and Dimension Consistency Assistant

This slice supports issue #16, AI-Powered Research Assistant Suite. It reviews
manuscript measurement packets before AI peer-review output is shown, focusing
on unit compatibility, rate denominators, normalization bases, and derived
claim precision.

The assistant uses only synthetic data and has no runtime dependencies. It is a
small deterministic reviewer gate that produces findings, remediation actions,
and reviewer artifacts for scientific manuscripts that mix measurements across
tables, figures, methods, and claims.

## Checks

- Claims comparing measurements with incompatible dimensions.
- Dose, concentration, and rate conversions with missing or unsafe bases.
- Per-time and per-mass denominators that do not match between evidence and
  claim text.
- Derived fold changes reported with more precision than the evidence supports.
- Normalized values that omit required context such as body mass, volume,
  surface area, or sample count.

## Local Verification

```bash
node ai-research-assistant/unit-dimension-consistency-assistant/test.js
node ai-research-assistant/unit-dimension-consistency-assistant/demo.js
git diff --check
```

The demo writes deterministic artifacts under
`ai-research-assistant/unit-dimension-consistency-assistant/artifacts/`.

## Files

- `assistant.js` - unit registry, conversion checks, and reviewer findings.
- `data/manuscript-measurements.json` - synthetic manuscript measurement
  packets.
- `test.js` - Node built-in tests.
- `demo.js` - deterministic JSON, Markdown, and SVG artifact generation.
