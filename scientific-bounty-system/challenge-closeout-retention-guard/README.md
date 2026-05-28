# Challenge Closeout Retention Guard

This module adds a focused post-challenge closeout guard for issue #18, Scientific Bounty System.

It validates what happens after a scientific bounty has been awarded, cancelled, or closed without award:

- Sponsor data-room access must be revoked after the closeout deadline.
- Restricted sponsor datasets must be returned, destroyed, or retained under an explicit legal hold.
- Solver IP transfer must stay blocked until settlement is funded and recorded.
- Reviewer/arbitration records must remain retained for the appeal window.
- Private challenge outputs must be redacted before any public winner announcement.
- Cancelled or no-award challenges must preserve solver work and compensation evidence.

The guard is dependency-free and uses synthetic records only. It emits deterministic JSON, Markdown, SVG, and MP4 artifacts for reviewer inspection.

## Files

- `guard.js` - closeout policy engine and report renderers.
- `data/closeout-records.json` - synthetic post-challenge closeout records.
- `demo.js` - generates JSON, Markdown, and SVG artifacts in `artifacts/`.
- `make-demo-video.js` - builds a short local MP4 demo with `ffmpeg`.
- `test.js` - dependency-free regression checks using Node's built-in `assert`.

## Verification

```sh
node scientific-bounty-system/challenge-closeout-retention-guard/test.js
node scientific-bounty-system/challenge-closeout-retention-guard/demo.js
node scientific-bounty-system/challenge-closeout-retention-guard/make-demo-video.js
```

## Scope Boundary

This is not another intake, rubric-readiness, scoring, arbitration, payout eligibility, sponsor scorecard, IP-redaction preview, data-room access grant, cancellation/no-award, or solver-withdrawal module. It focuses on the final closeout boundary after solver work has ended: revocation, destruction/return evidence, appeal-record retention, settlement-gated IP transfer, and public disclosure readiness.
