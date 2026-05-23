# Acceptance Notes

## Reviewer Outcome

The demo packet intentionally holds release because synthetic review events contain:

- an approved screen-reader accommodation with a missing dataset summary,
- an approved extended deadline without an adjusted deadline,
- an unsafe accommodation disclosure in an anonymous review,
- a too-short local response window,
- missing translation support, and
- negative reputation deltas that must be frozen until these issues are fixed.

## Expected Demo Output

```text
decision=hold-for-accessibility-review
fairness=0
findings=7
actions=7
digest=4d1c204c07ce84e5
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
