# Scientific Bounty Scope Change Guard

Self-contained guard for SCIBASE issue #18, Scientific Bounty System.

The module reviews sponsor-requested changes after a scientific bounty is launched. It blocks or escalates changes that would move the goalposts for solver teams: problem statements, deliverables, scoring rubrics, eligibility, prize schedules, NDA/data-room terms, and post-submission effective dates.

## What It Checks

- Material changes after launch are frozen unless they include sponsor, review, and audit evidence.
- Submitted or in-progress solver work is grandfathered when scope changes after submissions begin.
- Rubric weights still total 100 and changed scoring criteria have equal-notice evidence.
- Eligibility and NDA/data-room changes cannot silently narrow access for active teams.
- Prize schedule changes need finance/escrow evidence before scoring or payout.
- Active solver teams receive equal notice, and material changes require consent or a deadline extension.

## Files

- `index.js` - evaluation engine and report formatters
- `sample-data.js` - synthetic challenge scenarios
- `test.js` - dependency-free tests using Node's built-in `assert`
- `demo.js` - generates reviewer JSON, Markdown, and SVG reports
- `render-video.js` - renders a short MP4 with `ffmpeg`, or an animated GIF fallback with ImageMagick
- `reports/demo.mp4` / `reports/demo.gif` - reviewer demo artifact

## Validation

```bash
node scientific-bounty-scope-change-guard/test.js
node scientific-bounty-scope-change-guard/demo.js
node scientific-bounty-scope-change-guard/render-video.js
node --check scientific-bounty-scope-change-guard/index.js
node --check scientific-bounty-scope-change-guard/sample-data.js
node --check scientific-bounty-scope-change-guard/test.js
node --check scientific-bounty-scope-change-guard/demo.js
node --check scientific-bounty-scope-change-guard/render-video.js
```
