# Revenue Sanctions Export Gate

This self-contained Revenue Infrastructure slice protects subscription, AI compute, and analytics licensing revenue before billing or revenue recognition.

It validates institutional customers and revenue events against sanctions, restricted jurisdictions, export-control classification, denied counterparties, payment rail restrictions, and export license evidence.

## Checks

- Customer country and institution against restricted jurisdictions and denied entities.
- Analytics licensing exports against allowed data classifications and destination jurisdictions.
- AI compute sales against model export-control flags and intended use.
- Invoice release against required compliance documents and payment rail policy.
- Revenue recognition holds when export or sanctions evidence is incomplete.
- Signed audit events for finance and compliance systems.

## Run

```bash
node revenue-sanctions-export-gate/test.js
node revenue-sanctions-export-gate/demo.js
```

The demo writes:

- `sanctions-export-report.json`
- `finance-review-packet.md`
- `demo.svg`
- `demo.mp4` when `ffmpeg` is available
