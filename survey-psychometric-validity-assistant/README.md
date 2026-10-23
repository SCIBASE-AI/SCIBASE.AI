# Survey Psychometric Metadata Guard

A dependency-free, deterministic **partial component** related to issue #16's statistical/methodological peer-review flags. It evaluates caller-supplied metadata; it does not read manuscripts, calculate alpha/CFA from observations, establish construct validity, or generate AI peer reviews. No external APIs or credentials are used.

## Run

Requires Node.js 22 or newer. From `survey-psychometric-validity-assistant/`:

```bash
npm run check
npm test
npm run demo
node cli.js packet.json
```

CLI emits JSON: exit 0 = RELEASE, 2 = REVIEW, 3 = HOLD; exit 1 = usage/read/JSON error. See `src/samplePackets.js` for complete synthetic examples. Demo reports are generated in `reports/`.

## Input contract

| Field | Required value |
| --- | --- |
| `id`, `title` | Nonempty strings |
| `sampleSize` | Positive integer |
| `plannedCfaParameters` | Nonnegative integer; explicitly use 0 when CFA is not planned |
| `likertAnchors` | Nonempty array of nonempty labels, unique after case/space normalization |
| `constructClaims` | Nonempty array of nonempty construct labels |
| `scales` | Nonempty array of scale objects |
| Scale `name`, `construct` | Nonempty strings; scale names unique after normalization |
| Scale `cronbachAlpha` | Finite number at most 1; null/absent generates REVIEW; negative estimates are flagged as low consistency |
| Scale `items` | Nonempty array; each item has a globally unique nonempty `id`, finite `loading` in [-1,1] |
| Item `reverseCoded`, `reverseScored` | Optional booleans; a reverse-coded item must explicitly be reverse-scored |
| Scale `crossLoadings` | Required array (empty if none reported); entries reference an item in that scale and have finite `secondaryLoading` in [-1,1] |

Malformed/missing required evidence returns HOLD with `invalid_input` paths. Missing alpha returns a review finding; omega and other alternative reliability measures are not evaluated. Submitted evidence is not independently verified.

## Policy and limitations

Defaults: alpha < 0.7; absolute primary loading < 0.5; absolute secondary loading >= 0.32; fewer than 5 anchor labels; CFA sample size < 10 × parameter count. These are configurable **screening heuristics**, not universal validity criteria. Configure thresholds for the instrument, domain and analysis plan with a qualified reviewer. Anchor checks cannot detect semantic/order inconsistency. Construct matching uses normalized exact labels, not semantic inference or proof of validation. Signed loadings are compared by magnitude; interpretation of their direction remains a reviewer task.

Critical findings or weighted score >= 9 yield HOLD; any other finding yields REVIEW; only zero findings yields RELEASE. Weights: critical 5, high 3, medium 1. This score is an internal triage heuristic, not reproducibility confidence. RELEASE means only that configured metadata checks found no issue.

## Host integration

```js
import { releaseSurveyReview } from './src/release.js';
const outcome = await releaseSurveyReview({
  packet, review,
  publish: async (review, gateResult) => hostPublish(review, gateResult)
});
```

The adapter invokes `publish` only for RELEASE and propagates publication errors. The host must route publication through the adapter and apply all other authorization/review gates. This is a tested integration boundary, not an integration into an existing SCIBASE runtime. There is no target suite implementation in the upstream baseline.

## Issue #16 coverage

| Capability | Coverage |
| --- | --- |
| Auto peer review | Partial: structured methodological flags and metadata-label alignment only; no trained model, manuscript parsing, clarity/citation analysis or adaptive templates |
| Reproducibility checker | Not implemented: no sandbox execution, result comparison, dependencies, attempt history or confidence score |
| Research gap finder | Not implemented: no corpus analysis or personalized feed |

Partial milestone eligibility and integration architecture require an explicit maintainer decision; an open PR or `/claim` does not establish acceptance or payment.

## Demo video

`npm run demo:video` requires FFmpeg with drawtext support and a system font. It evaluates the current sample packets and renders their actual decisions/counts into a short summary video. It is a synthetic visualization, not a screen recording or evidence of production integration.
