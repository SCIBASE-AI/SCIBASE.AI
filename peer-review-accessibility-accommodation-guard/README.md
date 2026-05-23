# Peer Review Accessibility Accommodation Guard

Self-contained SCIBASE issue #15 slice for community reputation fairness.

The guard reviews synthetic peer-review reputation events before profile reputation deltas, service-credit penalties, badges, leaderboards, or project timelines update. It catches cases where reviewers could be penalized because approved accommodations, accessible artifacts, translation support, or local response windows were not honored.

## Checks

- Missing accessible artifacts after an accommodation is approved.
- Missing adjusted deadlines for approved extended-deadline accommodations.
- Unsafe accommodation disclosures in anonymous or double-blind reviews.
- Too-short local response windows before declined-assignment penalties.
- Missing translated abstracts when language support is required.
- Negative reputation deltas that must be frozen until fairness issues are resolved.

## Artifacts

Run:

```bash
npm run demo
npm run video
```

Generated reviewer artifacts are written to `reports/`:

- `accessibility-accommodation-packet.json`
- `accessibility-accommodation-report.md`
- `summary.svg`
- `demo.mp4`

## Safety

Synthetic data only. No live reviewers, medical records, accessibility records, identity services, project data, browser sessions, credentials, external APIs, payment data, or network calls are used.
