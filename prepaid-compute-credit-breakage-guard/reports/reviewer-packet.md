# Prepaid Compute Credit Breakage Review

As of: 2026-05-22T12:00:00.000Z
Audit digest: efffbafb34aec9e909ee2113672b18b88840ae580c37ef37207a2c7c8308a015

## Revenue Close Totals

- Open balance: $7,900.00
- Breakage eligible: $1,250.00
- Notice due: $1,800.00
- Refund liability: $500.00
- Finance hold: $2,450.00
- Protected balance: $1,100.00
- Currently usable: $800.00

## Lot Decisions

| Lot | Status | Balance | Recognizable | First action |
| --- | --- | ---: | ---: | --- |
| lot-expired-eligible | breakage_ready | $1,250.00 | $1,250.00 | Recognize breakage after finance approval |
| lot-expired-no-notice | finance_hold | $950.00 | $0.00 | Hold balance out of recognized revenue |
| lot-refund-window-open | refund_liability | $500.00 | $0.00 | Reserve as refund liability |
| lot-expiring-soon | notice_due | $1,800.00 | $0.00 | Send expiration notice before recognizing any breakage |
| lot-grant-no-expiry | protected | $1,100.00 | $0.00 | Carry balance forward |
| lot-active-future | usable | $800.00 | $0.00 | Keep credits usable |
| lot-dispute-hold | finance_hold | $1,500.00 | $0.00 | Hold balance out of recognized revenue |
