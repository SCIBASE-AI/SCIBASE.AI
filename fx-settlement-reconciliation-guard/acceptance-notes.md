# Acceptance Notes

## Scope

This PR adds a dependency-free Revenue Infrastructure module for multi-currency settlement reconciliation. It is scoped to the finance-control boundary between paid customer invoices and base-currency revenue/cash application.

## Validation

Run locally:

```bash
node fx-settlement-reconciliation-guard/test.js
node fx-settlement-reconciliation-guard/demo.js
node --check fx-settlement-reconciliation-guard/index.js
node --check fx-settlement-reconciliation-guard/test.js
node --check fx-settlement-reconciliation-guard/demo.js
git diff --check
```

The tests cover:

- ready foreign-currency settlement
- deterministic audit digest
- missing FX rate blocker
- weak FX source hold
- FX variance and booking reconciliation holds
- duplicate provider reference blocker
- settlement lag, provider fee, and cross-border tax evidence holds
- invalid cents validation

## Reviewer Notes

- All data is synthetic.
- All money is represented as integer cents.
- The module does not call external services or handle secrets.
- The output is deterministic so finance can archive the digest with the invoice and provider remittance packet.
