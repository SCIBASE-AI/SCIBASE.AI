# Acceptance Notes

The guard classifies requests as:

- `approved`: temporary scoped access can be granted.
- `approve_with_review`: after-hours access can proceed with mandatory owner review.
- `steward_review`: protected or risky access requires steward approval first.
- `denied`: request does not meet break-glass entry requirements.

Validation commands:

```bash
npm run check
npm test
npm run demo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,pix_fmt -of default=noprint_wrappers=1 reports/demo.mp4
git diff --check
git diff --cached --check
```
