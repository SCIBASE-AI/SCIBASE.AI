# Revenue Recognition Close

Dependency-free finance-close controls for the SCIBASE revenue infrastructure bounty.

This module focuses on what happens after subscription, compute, and licensing systems emit invoice and delivery evidence. It builds a deterministic close packet that answers:

- how much revenue is earned in the current period
- how much remains deferred
- which balances are still receivable
- which overdue invoices need dunning
- which credit, refund, or collection risks should hold close certification

## Run

```bash
npm run check
npm test
npm run demo
```

## Demo Output

```text
Close: scibase-apr-2026-close
Status: attention-needed
Recognized: US$7,936.30
Deferred after close: US$13,304.79
Receivable: US$12,200.00
Dunning queue: 1
Close holds: 2
Top action: finance-review for INV-2026-0391
```

## Files

- `src/revenue-close.js` builds the close packet, journal entries, dunning queue, holds, dashboard, audit trail, and stable digest.
- `data/sample-close.json` contains synthetic subscription, compute, and licensing contracts.
- `test/revenue-close.test.js` verifies recognition, deferral, receivable, dunning, hold, and digest behavior.
- `docs/requirement-map.md` maps the slice to issue #20.
- `docs/demo.svg` and `docs/demo.mp4` provide a short visual artifact for review.

No real payment processor, customer secret, private research content, or external API credential is used.
