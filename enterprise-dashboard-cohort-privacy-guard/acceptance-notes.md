# Acceptance Notes

The reviewer can verify this bounty slice without any external account or service.

## Expected Synthetic Result

The demo fixture produces:

- 4 dashboard widgets reviewed
- 8 dashboard rows reviewed
- 1 widget held for privacy review
- 3 widgets released only after masking or rollup
- 1 suppressed row
- 3 masked or rolled-up rows
- 1 raw export block

The critical case is `heatmap-private-oncology`: it is a private, recent, named-contributor activity row with a cohort smaller than the policy threshold and direct identifiers. The guard suppresses it, blocks raw exports, and emits admin remediation actions.

## Validation

```bash
npm run check
npm test
npm run demo
```

Optional video metadata check:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -show_entries format=size,duration -of default=noprint_wrappers=1 reports/demo.mp4
```

## Boundaries

This module does not implement a production dashboard UI, data warehouse, live webhook delivery, identity sync, access control, billing, or export adapter. It provides a deterministic privacy gate and reviewer packet for the enterprise dashboard trust boundary.
