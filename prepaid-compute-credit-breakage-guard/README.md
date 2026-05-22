# Prepaid Compute Credit Breakage Guard

This module is a focused Revenue Infrastructure slice for issue #20. It evaluates prepaid AI compute and top-up credit lots before finance recognizes expired unused balances as breakage revenue.

The guard keeps protected balances out of revenue, routes open refund obligations to liability review, requires notice and terms evidence before breakage, and emits deterministic audit artifacts for revenue close review.

## What It Checks

- Expired credit lots with explicit breakage terms, customer notice evidence, and closed refund windows.
- Expired lots that must stay on finance hold because evidence is missing or a dispute is active.
- Credits approaching expiration that need a customer notice before close.
- Grant-funded or no-expiration credits that must carry forward.
- Refund-window balances that remain liabilities.
- Usable active balances that should not be recognized.

## Run

```bash
npm run check
npm test
npm run demo
```

Demo artifacts are written under `reports/`, including JSON, Markdown, SVG, and the generated MP4 demo attached in the PR.
