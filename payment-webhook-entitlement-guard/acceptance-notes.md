# Acceptance Notes

## What To Review

- `index.js` implements the webhook-to-entitlement activation guard.
- `sample-data.js` includes risky duplicate, mismatched, invalid, stale, and reversal events plus a clean activation case.
- `test.js` validates duplicate prevention, amount mismatch, reversal holds, clean activation, and report rendering.
- `demo.js` generates the finance packet and visual demo artifact.

## Verification

```bash
node payment-webhook-entitlement-guard/test.js
node payment-webhook-entitlement-guard/demo.js
node --check payment-webhook-entitlement-guard/index.js
node --check payment-webhook-entitlement-guard/sample-data.js
node --check payment-webhook-entitlement-guard/test.js
node --check payment-webhook-entitlement-guard/demo.js
git diff --check
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of default=noprint_wrappers=1 payment-webhook-entitlement-guard/reports/demo.mp4
```

## Expected Demo Result

The risky packet returns `hold_entitlement_activation` with blockers for duplicate webhook replay, existing grant double-credit risk, amount mismatch, invalid/stale signature, and refund/reversal reconciliation. The clean packet returns `activate_paid_entitlements`.
