# Challenge Accessibility Localization Guard

Self-contained SCIBASE Scientific Bounty System slice for issue #18. The guard checks whether global solver teams can understand and access challenge materials before submissions open.

## Why this slice is distinct

Existing #18 submissions cover intake, rubric readiness, arbitration, workspace privacy, clarification freeze, deadline fairness, communication parity, onboarding clock parity, debrief feedback, duplicate-solver checks, escrow, payout eligibility, sponsor compliance, and award transparency. This module focuses only on accessibility and localization parity: languages, translation freshness, captions/transcripts, screen-reader formats, timezone displays, and accessible prequalification forms.

## Run

```bash
npm test
npm run demo
npm run demo:video
```

Demo artifacts are written to `reports/`, including JSON, Markdown, SVG, GIF, and MP4 files.
