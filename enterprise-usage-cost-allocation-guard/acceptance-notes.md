# Acceptance Notes

The guard accepts synthetic enterprise usage records and classifies each record
as one of:

- `approved`: ready for dashboard and grant chargeback export.
- `hold`: missing required evidence, ownership, amount, or funding-window validity.
- `reallocate`: valid usage that must move to a permitted cost center.
- `private_review`: valid private/restricted project usage that requires
  aggregate-only admin handling before publication.

Validation commands:

```bash
npm run check
npm test
npm run demo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,pix_fmt -of default=noprint_wrappers=1 reports/demo.mp4
git diff --check
git diff --cached --check
```
