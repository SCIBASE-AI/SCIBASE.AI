# Enterprise cost center chargeback guard

This module checks whether institutional compute or service usage can be posted back to a department cost center.

It focuses on one enterprise tooling slice: chargeback readiness. It does not process payments, move money, call finance systems, or store credentials.

## What it checks

- active cost center
- PI approval
- grant allowability
- expense category rules
- remaining budget and overage approval
- usage evidence
- data residency
- purchase order and tax code gaps

## Run it

```bash
node enterprise-cost-center-chargeback-guard/test.js
node enterprise-cost-center-chargeback-guard/demo.js
```

The demo writes a JSON result and Markdown report to `artifacts/`.
