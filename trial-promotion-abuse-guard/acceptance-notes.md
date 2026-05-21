# Acceptance Notes

## Included Checks

- Duplicate free-trial attempts by institution domain and payment fingerprint.
- Disposable-domain trial rejection.
- Coupon stacking above the configured policy limit.
- Discount cap enforcement with prevented-leakage cents.
- Consortium discount hold when roster evidence is expired.
- Trial-to-paid hold when payment verification is missing.
- Clean discount approval path for a valid lab account.

## Validation

Run from this directory:

```sh
npm run check
npm test
npm run demo
```

The test suite verifies both blocking behavior and one clean approval path. The
demo regenerates the finance review packet and visual summary from the checked-in
sample data.
