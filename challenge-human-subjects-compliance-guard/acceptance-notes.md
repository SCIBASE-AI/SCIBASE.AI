# Acceptance Notes

## Bounty Scope

This contribution targets the Scientific Bounty System in issue #18 with a distinct human-subjects compliance guard. It is a focused safety layer for scientific challenges involving patient, participant, clinical, or survey-derived data.

## Validation

Expected local checks:

```bash
npm run check
npm test
npm run demo
git diff --check
ffprobe reports/demo.mp4
```

## Privacy Boundary

- Synthetic data only.
- No secrets.
- No external APIs.
- No real patient or participant records.
- No payout account, tax, bank, wallet, or KYC details.

## Review Notes

The implementation is intentionally small and deterministic so maintainers can inspect the compliance decisions quickly. The guard should hold unsafe submissions before sponsor review, scoring, payout, or IP transfer, while allowing compliant aggregate submissions to proceed.
