# Collaborative Data Availability Statement Guard

Self-contained Real-time Collaborative Research Editor slice for
`SCIBASE-AI/SCIBASE.AI#12`.

The guard evaluates whether a collaborative manuscript can be exported with
complete data and code availability statements. It checks required availability
sections, repository accessions, statement citations, dataset/code licenses,
reviewer-only access windows, de-identification evidence for human-derived
material, role-based approvals, blocking comments, and unmerged editor changes.

This is intentionally separate from reference-library merging, notification
visibility, accessibility, presence privacy, evidence binding, and general
embargo-release workflows. Its job is to gate the final manuscript export when
the availability statement and linked artifact evidence are not review-ready.

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Outputs

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`

All data is synthetic. The module does not call repository hosts, journal
systems, identity services, storage APIs, email systems, or live manuscript
export services.
