# Acceptance Notes

## Validation

Run from the repository root:

```bash
node partner-royalty-settlement-guard/test.js
node partner-royalty-settlement-guard/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 partner-royalty-settlement-guard/demo.mp4
```

## Expected Review Signals

- Ready settlement releases payout lines and archives the digest.
- Low anonymized subject count becomes a hold, not a blocker, so finance can aggregate more usage.
- Duplicate invoice, expired agreement, missing consent, unauthorized use case, and split mismatch block release.
- Audit digest remains stable for identical input.
- All calculations use integer cents.

## Scope Boundary

This is an audit and policy module. It intentionally stops before live payout-provider integration so the demo remains credential-free and safe to run in CI or during review.
