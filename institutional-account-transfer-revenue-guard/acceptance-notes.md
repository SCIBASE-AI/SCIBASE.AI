# Acceptance Notes

## Reviewer Checklist

- The module is self-contained under `institutional-account-transfer-revenue-guard/`.
- The implementation is dependency-free and runs with Node.js only.
- Sample data is synthetic and does not include private billing data.
- Tests cover approval, conditional discount reset, overdue invoice hold,
  license-transfer hold, SSO-domain hold, and compute-credit ownership hold.
- Demo artifacts can be regenerated locally.

## Commands Run

```bash
npm run check
npm test
npm run demo
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reports/demo.mp4
git diff --check
```

## Limitations

- This is a deterministic local guard, not a live billing-provider integration.
- It does not perform KYB/KYC, collect payment details, or call Stripe, PayPal,
  SSO, DPA, or procurement systems.
- The policy thresholds are sample defaults and are meant to be replaced by
  SCIBASE production policy values if this slice is integrated into a larger
  application.
