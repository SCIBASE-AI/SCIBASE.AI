# Preregistration Deviation Assistant

This module adds a focused preregistration deviation assistant for the SCIBASE AI-Powered Research Assistant Suite.

It compares a manuscript against a preregistration or registered report before AI peer review labels claims as confirmatory. The goal is to make outcome switching, post-hoc exclusions, model drift, and unregistered subgroup claims visible in a deterministic reviewer packet.

The module is dependency-free, synthetic-data-only, and offline. It does not make model calls, registry lookups, or external network requests.

## What It Checks

- Registration identity and timing.
- Primary outcome switches and secondary-to-primary promotions.
- Registered secondary outcomes omitted from the manuscript.
- Analysis model, covariate, and multiple-testing correction deviations.
- Sample-size deviations from the registered plan.
- Registered exclusion criteria omitted or post-hoc exclusions added.
- Unregistered subgroup findings presented as confirmatory.
- Retrospective registration and post-unblinding amendments.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo writes `reports/summary.json`, `reports/reviewer-packet.md`, and `reports/summary.svg`.

## Output

The primary status is one of:

- `ready`: no blockers or warnings.
- `review`: no blockers, but a research integrity reviewer should inspect warnings.
- `hold`: confirmatory AI review should be held until preregistration blockers are corrected or disclosed.

Each result includes deterministic blocker codes, remediation actions, a reviewer packet, and an audit digest.
