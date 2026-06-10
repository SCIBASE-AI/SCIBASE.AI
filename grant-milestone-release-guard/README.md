# Grant milestone release guard

This is a small revenue-control slice for institutional research work. It checks whether a grant or sponsor milestone is ready to invoice before finance sends the bill.

The guard is intentionally offline. It uses synthetic records only and does not connect to Stripe, banks, customer systems, sponsor portals, private research data, or external APIs.

## What it checks

- active contract and valid purchase order
- ethics approval when the milestone needs it
- sponsor acceptance, deliverable packet, and finance owner evidence
- invoice currency, milestone cap, open credits, duplicate invoice hashes, and budget notice timing

## Actions

- `RELEASE_INVOICE`: evidence is complete and finance can send the invoice
- `HOLD_FOR_REVIEW`: the invoice may be valid, but someone needs to fix missing evidence or credits first
- `BLOCK_INVOICE`: the contract or invoice is unsafe enough that it should not be sent

## Run it

```bash
node grant-milestone-release-guard/test.js
node grant-milestone-release-guard/demo.js
```

The demo writes a Markdown report and JSON result file under `grant-milestone-release-guard/artifacts/`.
