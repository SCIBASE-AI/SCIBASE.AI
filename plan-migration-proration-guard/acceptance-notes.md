# Acceptance Notes

## Scope

This PR adds a dependency-free Revenue Infrastructure module for plan migration proration. It is intentionally scoped to the finance-control boundary that sits between account lifecycle changes and downstream invoice/payment systems.

## Validation

Run locally:

```bash
node plan-migration-proration-guard/test.js
node plan-migration-proration-guard/demo.js
node --check plan-migration-proration-guard/index.js
node --check plan-migration-proration-guard/test.js
node --check plan-migration-proration-guard/demo.js
git diff --check
```

The tests cover:

- ready upgrade with deterministic audit digest
- mid-term downgrade hold
- seat-floor blocker
- duplicate invoice blocker
- trial-to-paid payment readiness blocker
- invalid cents validation

## Reviewer Notes

- All data is synthetic.
- All money is represented as integer cents.
- The module does not call external services or handle secrets.
- The output is deterministic so finance can archive the digest with the quote and invoice packet.
