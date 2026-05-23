# Acceptance Notes

## Reviewer Outcome

The demo packet intentionally blocks release because synthetic charge requests contain:

- an expired saved card,
- stale SCA evidence,
- a missing ACH mandate,
- an ACH mandate that does not cover AI compute top-ups,
- an amount variance above the authorized threshold without customer notice, and
- a currency change without customer notice.

## Expected Demo Output

```text
decision=block-unsafe-charges
authorization=0
findings=8
actions=8
```

## Verification

Run from this directory:

```bash
npm run check
npm test
npm run demo
npm run video
```

The module is dependency-free except for optional local ffmpeg usage when regenerating `reports/demo.mp4`.
