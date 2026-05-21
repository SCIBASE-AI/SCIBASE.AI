# Acceptance Notes

## Reviewer Checklist

- Self-contained under `study-power-feasibility-assistant/`.
- Dependency-free Node.js implementation.
- Synthetic study metadata only.
- Tests cover pass, revise, and hold decisions.
- Demo artifacts are generated locally and include an MP4 proof artifact.

## Commands Run

```bash
npm run check
npm test
npm run demo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reports/demo.mp4
git diff --check
```

## Limitations

- The sample-size formulas are deterministic screening heuristics for review
  triage, not a substitute for a full statistical analysis plan.
- Production integration should replace the sample policy constants with
  SCIBASE domain-specific statistical review templates.
