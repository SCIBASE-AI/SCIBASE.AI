# Acceptance Notes

## Reviewer Checks

- A dataset with transformed identifiers, acceptable k-anonymity, approved sensitive columns, redaction review evidence, and coarsened locations is release-ready.
- A dataset with direct identifiers, weak k-anonymity, precise locations, missing approvals, or too many sensitive columns is blocked.
- A dataset with a single redaction-review gap is routed to release review instead of being silently published.
- Malformed dataset or column evidence is blocked with a repair action instead of crashing release assessment.
- Synthetic sample data contains no live datasets, credentials, private user data, or external service calls.

## Expected Commands

```bash
npm run check
npm test
npm run demo
```

Optional artifact validation:

```bash
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reports/demo.mp4
```
