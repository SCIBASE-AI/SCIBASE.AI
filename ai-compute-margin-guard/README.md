# AI Compute Margin Guard

Self-contained Revenue Infrastructure module for SCIBASE issue #20.

This slice focuses on the margin side of AI compute billing: what each AI job actually costs, whether a subscription/top-up price protects gross margin, and when finance should hold or reroute expensive workloads before they become negative-margin usage.

## Capabilities

- Allocates provider costs for tokens, GPU seconds, storage days, reproducibility runs, and platform overhead.
- Compares recognized AI compute revenue against cloud cost for each account.
- Enforces gross-margin floors by plan and institution type.
- Detects underpriced top-ups, quota burn risk, unpaid top-up balances, unknown provider SKUs, and grant budget overrun risk.
- Recommends cheaper provider routing when a compatible SKU exists.
- Produces deterministic audit digests for reviewer evidence.
- Generates a reviewer packet with account summaries, holds, recommendations, and pricing-floor notes.

## Run locally

```bash
cd ai-compute-margin-guard
npm run check
npm test
npm run demo
```

The demo writes:

- `docs/demo-output.json`
- `docs/demo-transcript.md`

## Files

- `src/compute-margin-guard.js` - margin engine and audit helpers.
- `data/sample-workspace.json` - synthetic plans, accounts, jobs, provider SKUs, top-ups, and budgets.
- `test/compute-margin-guard.test.js` - dependency-free Node tests.
- `scripts/check.js` - static integrity checks for the module.
- `scripts/demo.js` - reviewer-facing demo report generator.
- `docs/requirement-map.md` - mapping back to issue #20 acceptance areas.

## Safety

All data is synthetic. No live Stripe, PayPal, cloud, invoice, API, bank, grant, or customer credentials are used.
