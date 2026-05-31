# Revenue Price Escalation Cap Guard

This is a self-contained Revenue Infrastructure slice for issue #20.

The guard checks whether annual institutional renewal price increases can be released before renewal invoices or entitlement changes are issued. It validates contract uplift caps, CPI/source evidence, customer notice windows, excluded account types, multi-year price locks, exception approvals, and deterministic finance remediation actions.

## Scope

- Synthetic data only.
- No network calls, credentials, payment processor integration, CPQ/CRM calls, tax filing, bank data, or SCIBASE production service integration.
- Focused on contract price escalation release safety, not broad billing ledgers, renewal notice delivery, pricing experiments, tax exemption, quote approval, dunning, refunds, support entitlement, collections, or analytics seat rosters.

## Validation

```sh
node revenue-price-escalation-cap-guard/test.js
node revenue-price-escalation-cap-guard/demo.js
```

The demo writes deterministic reviewer artifacts under `revenue-price-escalation-cap-guard/reports/`.

Reviewer artifacts:

- `reports/price-escalation-packet.json`
- `reports/price-escalation-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`
