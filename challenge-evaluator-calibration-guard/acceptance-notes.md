# Acceptance Notes

## Reviewer Checks

- A clean challenge is allowed into live scoring only when all guard checks pass.
- A challenge with missing seed coverage, ineligible evaluator scores, conflicts, or missing normalization anchors is held from live scoring.
- A challenge with only drift/spread warnings is routed to recalibration before live scoring.
- Synthetic sample data contains no payment, identity, address, credential, or private dashboard data.

## Expected Commands

```bash
npm run check
npm test
npm run demo
```

Optional artifact validation:

```bash
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reports/demo.mp4
```
