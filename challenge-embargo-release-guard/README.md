# Challenge Embargo Release Guard

Focused Scientific Bounty System slice for issue #18.

The guard reviews post-award release packets before winner announcements, datasets, notebooks, or open-source packages move from private challenge state to public or sponsor-visible release. It blocks release when sponsor embargoes, patent/publication holds, NDA approvals, solver public-name consent, funder deadlines, checksums, licenses, or redaction evidence are not ready.

## Run

```bash
npm test
npm run check
npm run demo
npm run video
```

## Reviewer Artifacts

- `reports/embargo-release-packet.json`
- `reports/embargo-release-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Scope

This is distinct from award transparency and clarification-freeze work. It does not score submissions, explain final ranks, arbitrate disputes, or broadcast Q&A updates. It decides whether release artifacts are allowed to leave embargoed/private state.
