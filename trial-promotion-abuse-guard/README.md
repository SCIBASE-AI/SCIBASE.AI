# Trial Promotion Abuse Guard

This module is a focused revenue-control slice for issue #20. It checks whether
free trials, coupons, consortium discounts, and trial-to-paid conversions are
safe to release into invoice-facing revenue.

The guard is intentionally self-contained and uses only synthetic data. It does
not call payment processors, billing providers, or customer systems.

## What It Catches

- Repeat free trials on the same institution domain.
- Repeat trial attempts using the same payment fingerprint.
- Disposable-domain trials.
- Coupon stacking above policy.
- Consortium discounts without an active roster entry.
- Trial-to-paid conversion attempts without verified payment.
- Discount leakage before invoice release.

## Local Review

```sh
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts under `reports/`:

- `promotion-abuse-packet.json`
- `promotion-abuse-report.md`
- `summary.svg`
- `summary.png`
- `demo.mp4`

`demo.mp4` is a short H.264 reviewer preview generated from the checked-in
summary frame.

## Reviewer Outcome

Finance gets a deterministic decision packet showing which promotions can be
approved, which need a hold, which should be rejected, and how much discount
leakage was prevented before the invoice is released.
