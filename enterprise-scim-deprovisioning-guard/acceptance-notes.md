# Acceptance Notes

## Reviewer Checklist

- Self-contained under `enterprise-scim-deprovisioning-guard/`.
- Dependency-free Node.js implementation.
- Synthetic enterprise identity data only.
- Tests cover clear, review, and revoke decisions.
- Demo artifacts include JSON, Markdown, SVG, and MP4 outputs.

## Commands Run

```bash
npm run check
npm test
npm run demo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reports/demo.mp4
git diff --check
```

## Limitations

- This is a deterministic local guard, not a live SCIM or HRIS connector.
- Production integration should replace synthetic events with signed SCIBASE
  identity lifecycle and connector audit logs.
