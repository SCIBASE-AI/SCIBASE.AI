# Acceptance Notes

## Reviewer Checks

- A project with no sensitive inherited overexposure, no stale allow overrides, required steward approvals, and explicit restricted-action overrides is ready.
- A project with inherited restricted dataset download, review-thread read/comment, or notebook execute exposure is blocked.
- Stale object-level allow overrides produce review findings.
- Missing data-steward approval for sensitive pending actions blocks permission changes.
- Synthetic sample data contains no credentials, private user data, identity-provider calls, or production project data.

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
