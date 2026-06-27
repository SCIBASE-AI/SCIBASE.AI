# Enterprise Export Maintenance Guard

Self-contained reviewer artifact for SCIBASE issue #19, focused on institutional export destination readiness before pushing research outputs to repositories, LMS, ELN, or funder systems.

The guard evaluates synthetic export jobs for:

- active destination maintenance windows
- institutional blackout calendars
- degraded destination health
- stale status evidence
- retry windows that exceed enterprise policy
- missing export-owner acknowledgement for risky timing
- embargo-sensitive payloads that must be held instead of automatically retried

It emits deterministic `SEND`, `DEFER`, or `HOLD` decisions with JSON, Markdown, SVG, and MP4 artifacts. It uses no credentials, no private tenant data, no external APIs, no live status pages, and no payment systems.

## Requirement Mapping

| Issue #19 capability | Covered here |
| --- | --- |
| Export pipelines | Gates export jobs before delivery to institutional destinations |
| API and integration safety | Checks destination health and retry policy before external transmission |
| Admin governance | Produces audit-ready findings and owner acknowledgement requirements |
| Compliance reporting | Holds embargo-sensitive exports during unsafe destination timing |

## Local Validation

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

Generated artifacts are written to `reports/`.
