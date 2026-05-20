# Acceptance Notes

## Scope

The module adds a narrow payment rail failover readiness guard for Revenue
Infrastructure. It is intended to be reviewed as an independent control layer,
not as a replacement for live billing or processor integrations.

## Reviewer Checklist

- Run `node payment-rail-failover-guard/test.js`.
- Run `node payment-rail-failover-guard/demo.js`.
- Confirm `rail-failover-report.json` contains release, fallback, hold, and block
  examples.
- Confirm `finance-review-packet.md` summarizes the decisions and audit digest.
- Confirm `demo.svg` and `demo.mp4` show the demo outcome.

## Assumptions

- All customer, invoice, rail, and incident data is synthetic.
- Live processor credentials are intentionally out of scope.
- Fallback rail use requires stronger controls than normal primary rail release
  because duplicate charges, settlement timing, and customer notice can change.
