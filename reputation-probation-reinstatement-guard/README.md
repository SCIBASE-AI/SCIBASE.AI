# Reputation Probation Reinstatement Guard

Self-contained reviewer artifact for SCIBASE issue #15, focused on safe reputation re-entry after moderation probation.

This slice is intentionally narrow. It does not duplicate broad community ledgers, endorsement rings, review calibration, badge renewal/decay, leaderboard eligibility, civility checks, correction impact, peer-review recertification, workload equity, profile credit consent, or abuse detection. It evaluates whether reputation accrual can restart after a moderation outcome is already known.

## What It Checks

- Minimum probation windows before profile reputation deltas resume.
- Open appeals that should block reinstatement.
- Required remediation evidence and reviewer quorum.
- Public-redacted reinstatement receipts instead of private moderation-note exposure.
- Reputation deltas accidentally applied during probation.
- Capped re-entry so badges and leaderboards do not jump immediately after reinstatement.

## Local Verification

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

`npm run demo` writes reviewer artifacts to `reports/`:

- `clean-audit.json`
- `risky-audit.json`
- `risky-review.md`
- `summary.svg`
- `manifest.json`
- `demo.mp4`

## Requirement Mapping

- Community reputation: protects score, badge, and leaderboard updates during probation.
- Transparency: emits redacted reinstatement decisions and remediation actions.
- Fairness: requires remediation evidence and independent moderator quorum before trust re-entry.
- Reviewer demonstration: synthetic clean/risky packets produce JSON, Markdown, SVG, and MP4 artifacts without credentials or external services.
