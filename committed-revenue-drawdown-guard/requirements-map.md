# Requirements Map

Issue #20 asks for revenue infrastructure covering subscription billing, AI compute billing, licensing APIs and analytics, institutional plans, usage-based pricing, quotas, top-ups, and sustainable recurring revenue.

## Tiered Subscription Billing

- `commitments.subscription` models contracted subscription minimums for institutional and lab accounts.
- `summarizeStream()` compares actual subscription consumption against expected drawdown for the elapsed contract period.
- Under-consumption recommendations create customer-success drawdown actions before renewal risk appears.

## AI Compute Billing

- `commitments.compute` and compute usage entries model AI compute commitments and usage drawdown.
- `marginRisks()` blocks low-margin compute usage when gross margin falls below the configured finance floor.
- Overage projections create paid-amendment review actions instead of silently allowing compute burn to exceed contracted coverage.

## Licensing APIs And Analytics

- `commitments.analytics` evaluates analytics licensing commitments, exports, and white-label usage.
- Credit-expiration checks identify unused analytics pools before institutional reporting windows close.
- Portfolio output separates analytics consumption from subscription and compute streams.

## Revenue Operations Evidence

- `evaluatePortfolio()` emits committed, consumed, projected, at-risk, and expansion-upside totals.
- `auditDigest()` signs deterministic evidence from normalized contract summaries and recommended actions.
- `demo.js` writes reviewer-ready JSON and SVG reports without any live billing provider or customer data.

## Acceptance Evidence

- Dependency-free implementation using Node.js standard library only.
- Synthetic sample contracts only.
- Regression tests cover overage risk, under-consumption risk, credit expiration, low-margin usage, deterministic digests, and portfolio ordering.
- Demo output can be regenerated locally with `node committed-revenue-drawdown-guard/demo.js`.
- The submitted demo bundle includes both a GIF walkthrough and `reports/demo.mp4` encoded as H.264 video for the Algora short-demo requirement.
