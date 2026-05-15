# Privacy-Safe Licensing Gate

This module adds a credential-free revenue-infrastructure slice for analytics licensing. It evaluates whether a candidate data product is safe to package for institutional, government, or research-funder customers before it can become paid API, dashboard, or white-label inventory.

The goal is to support the revenue stream described in issue `#20` without touching live payment processors, payout credentials, private content, or customer secrets.

## What It Does

- checks that exports contain aggregated research metadata rather than private project content
- blocks direct identifiers and configured forbidden fields before revenue recognition
- enforces consent coverage, cohort size, institution count, and k-anonymity thresholds
- produces reviewer-ready hold reasons for exports that are not safe to license
- estimates eligible monthly licensing revenue only for ready packages
- emits a compact report that can feed an institutional analytics dashboard or licensing API
- builds a sanitized licensing API catalog that omits internal hold actions and blocked-field details

## Files

- `src/privacy-safe-licensing-gate.mjs` contains the policy engine.
- `tests/privacy-safe-licensing-gate.test.mjs` covers safe, held, custom-policy, and API-catalog decisions.
- `demo.mjs` prints a sample readiness report.
- `docs/demo-transcript.md` and `docs/demo.mp4` show the reviewer demo flow.
- `requirement-map.md` maps the implementation back to the Revenue Infrastructure bounty.

## Local Verification

Run the module checks:

```bash
cd privacy-safe-licensing-gate
npm run check
npm test
npm run demo
```

From the repository root, the same commands are:

```bash
node privacy-safe-licensing-gate/scripts/check.mjs
node --test privacy-safe-licensing-gate/tests/privacy-safe-licensing-gate.test.mjs
node privacy-safe-licensing-gate/demo.mjs
```

No environment variables, network calls, payment credentials, or customer secrets are required.
