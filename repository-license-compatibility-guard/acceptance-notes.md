# Acceptance Notes

The guard classifies release assets as:

- `publishable`: compatible with the requested release/export intent.
- `notice_required`: export can proceed after attribution or notice completion.
- `conflict`: license terms conflict with the export intent.
- `hold`: release-blocking missing, proprietary, unsupported, or incomplete evidence.

Validation commands:

```bash
npm run check
npm test
npm run demo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,pix_fmt -of default=noprint_wrappers=1 reports/demo.mp4
git diff --check
git diff --cached --check
```
