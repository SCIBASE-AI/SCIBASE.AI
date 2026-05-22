# Biomethods Provenance Assistant

Self-contained AI-assisted research tools slice for issue #13. It gives peer reviewers a deterministic biology methods provenance packet before manuscript review.

## What It Checks

- Biospecimen source, organism, strain, sex, and age context.
- Cell-line source, authentication method/date, and mycoplasma test evidence.
- Critical reagent vendor, catalog, lot, and antibody RRID traceability.
- Reagent batch conflicts across method sections that need author explanation.

## Outputs

- `reports/biomethods-provenance-packet.json`: structured reviewer decisions and findings.
- `reports/reviewer-report.md`: readable reviewer report for each synthetic scenario.
- `reports/summary.svg`: visual decision summary.
- `reports/demo.mp4`: short demo artifact for Algora review.

## Local Verification

```bash
node --test biomethods-provenance-assistant/test.js
node biomethods-provenance-assistant/demo.js
node --check biomethods-provenance-assistant/index.js
node --check biomethods-provenance-assistant/sample-data.js
node --check biomethods-provenance-assistant/demo.js
node --check biomethods-provenance-assistant/test.js
```

The module is dependency-free, uses synthetic data only, and makes no network calls.
Set `FFMPEG_PATH` to an ffmpeg binary before running `demo.js` if regenerating `reports/demo.mp4`.
