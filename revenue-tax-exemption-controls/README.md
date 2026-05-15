# Revenue Tax Exemption Controls

This module adds a focused Revenue Infrastructure slice for institutional tax exemption and grant billing compliance. It avoids live payment credentials and evaluates invoice readiness with deterministic local data.

## What it checks

- Expired or missing exemption certificates
- Reverse-charge invoices without VAT ID evidence
- Tax amount mismatch against configured jurisdictions
- Unknown tax jurisdictions that require finance review
- Grant budget overrun risk
- Invoice line categories outside grant-approved spend
- Payment settlement events that are missing or mismatched
- Invoice-level recommended actions and an audit digest

## Run locally

```bash
npm run check
npm test
npm run demo
```

The sample data intentionally places two invoices on hold: one has an expired exemption certificate, grant-category drift, and settlement mismatch; the other has missing VAT ID evidence for reverse charge.
