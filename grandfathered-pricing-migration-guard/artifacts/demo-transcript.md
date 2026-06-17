# Demo Transcript

1. Load five synthetic legacy-price account packets.
2. Evaluate notice windows, price locks, consent thresholds, add-on parity, usage regressions, and reviewer evidence.
3. Emit deterministic invoice-release decisions: RELEASE_INVOICE, REVIEW_BEFORE_RELEASE, or HOLD_INVOICE.
4. Write JSON, Markdown, and SVG artifacts for reviewer replay.

## Demo Output

- Release: 1
- Review: 1
- Hold: 3
- Held accounts: acct-lab-price-lock, acct-notice-gap, acct-currency-mismatch
- Review accounts: acct-grace-review
