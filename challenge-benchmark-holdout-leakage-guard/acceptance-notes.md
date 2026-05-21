# Acceptance Notes

## Reviewer Checklist

- Self-contained under `challenge-benchmark-holdout-leakage-guard/`.
- Dependency-free Node.js implementation.
- Synthetic challenge metadata only.
- Tests cover ready-to-score, sponsor-review, and quarantine decisions.
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

- This is a deterministic pre-scoring guard, not a live challenge storage or
  data-room integration.
- Production integration should replace sample policy values and synthetic
  events with signed SCIBASE challenge audit logs.
