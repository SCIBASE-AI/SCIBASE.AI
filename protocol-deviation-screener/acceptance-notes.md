# Acceptance Notes

This is a focused, non-overlapping slice for the AI-assisted research tools MVP.

## Scope

- Protocol/preregistration deviation screening.
- Deterministic reviewer packets for manuscript triage.
- Citation recommendation for missing protocol or registry record.

## Non-goals

- No live plagiarism detection.
- No external literature retrieval.
- No medical or statistical validity claim beyond rule-based review triage.
- No replacement for human peer review.

## Validation

Run locally:

```bash
node protocol-deviation-screener/test.js
node protocol-deviation-screener/demo.js
node --check protocol-deviation-screener/index.js
node --check protocol-deviation-screener/test.js
node --check protocol-deviation-screener/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 protocol-deviation-screener/demo-output/demo.mp4
git diff --check
```

Demo artifacts are generated from synthetic protocol and manuscript packets.
