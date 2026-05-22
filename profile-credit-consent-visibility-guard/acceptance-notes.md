# Acceptance Notes

- Dependency-free CommonJS module.
- Synthetic sample records only.
- No live service calls, credentials, secrets, payment data, payout data, or
  private profile data.
- Deterministic `sha256` audit digest for reviewer-visible output.
- Tests cover:
  - publishable public profile/citation credits
  - double-blind review redaction
  - embargoed citation-only credits
  - revoked consent holds
  - institutional-only private evidence
  - missing or mutable evidence holds
  - deterministic digest generation

Expected validation:

```bash
npm run check
npm test
npm run demo
```
