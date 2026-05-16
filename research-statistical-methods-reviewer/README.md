# Research Statistical Methods Reviewer

This module adds a focused AI research assistant slice for statistical rigor review before submission. It evaluates synthetic manuscript review dockets for claim-to-analysis coverage, statistical test choice, sample-size and power evidence, multiplicity controls, selective-reporting signals, reproducibility prerequisites, and signed reviewer packets.

## What It Covers

- Claim-to-analysis mapping for manuscript statements.
- Evidence artifact availability and content-hash readiness.
- Test-choice checks for repeated-measures, longitudinal, continuous, and categorical outcomes.
- Sample-size, power, effect-size, and p-value risk signals.
- Multiple-comparison correction and selective-reporting checks.
- Reproducibility evidence for raw data, scripts, environments, and deterministic seeds.
- Reviewer-ready recommendations and HMAC-signed audit packets.
- Synthetic data only; no credentials, live patient data, or external APIs.

## Run It

```bash
npm run check
npm test
npm run demo
npm run demo:gif
```

## Demo Output

```text
Statistical methods review assistant demo
As of 2026-05-16T00:00:00.000Z: 1 ready, 1 needs review, 1 blocked
Findings: 7 blockers, 10 review items; average rigor score 65
ms-neuro-stim-response: needs_review score=96 blockers=0 reviews=1
  top risk: power: age-adjusted-model is below the 80% power target (64%)
ms-microbiome-signature: blocked score=0 blockers=7 reviews=9
  top risk: assumptions: pathway-screen lacks normality evidence for a small-sample t-test
ms-climate-replication: ready score=100 blockers=0 reviews=0
  top risk: no open risks
Signed review packet: ms-neuro-stim-response digest=... signature=...
```

## Files

- `src/statistical-methods-reviewer.js` - dependency-free statistical review evaluator.
- `data/sample-review-docket.json` - synthetic manuscripts, claims, analyses, and evidence artifacts.
- `test/statistical-methods-reviewer.test.js` - coverage for review outcomes, blockers, power checks, and signatures.
- `docs/requirement-map.md` - issue #16 coverage and non-overlap notes.
- `docs/demo.svg` and `docs/demo.gif` - short demo artifacts for review.
