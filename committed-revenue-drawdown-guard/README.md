# Committed Revenue Drawdown Guard

This module adds a self-contained finance control slice for SCIBASE revenue infrastructure. It evaluates institutional minimum commitments across subscription seats, AI compute, and analytics licensing so finance and customer teams can see whether contracted revenue is being consumed, at risk, or ready for a paid amendment.

The implementation is dependency-free and uses synthetic customer data only. It does not connect to Stripe, PayPal, bank rails, wallets, billing providers, live customer records, or external APIs.

## What It Checks

- Contracted annual minimums by revenue stream
- Actual consumption against the time-elapsed expectation
- Projected final consumption and overage risk
- Under-consumption that could threaten renewal or recognition confidence
- Expiring prepaid credits without a drawdown plan
- AI compute usage below the configured gross-margin floor
- Recommended actions for finance, customer success, account executives, and finance ops
- Deterministic audit digests for reviewer and month-end evidence packets

## Usage

Run the assertion tests:

```bash
node committed-revenue-drawdown-guard/test.js
```

Run the demo:

```bash
node committed-revenue-drawdown-guard/demo.js
```

The demo writes:

- `reports/demo-output.json` with the full portfolio evaluation
- `reports/demo.svg` with a visual portfolio summary
- `reports/demo.gif` as a short visual walkthrough artifact
- `reports/demo.mp4` as the H.264 short demo video for bounty review

## Files

- `index.js`: revenue drawdown, amendment, credit-expiration, margin, and audit logic
- `sample-data.js`: synthetic institutional contracts and usage
- `test.js`: dependency-free regression assertions
- `demo.js`: CLI demo plus JSON and SVG report generation
- `requirements-map.md`: mapping from issue requirements to implementation evidence

## Scope Differentiation

This is not another generic billing ledger, usage meter, tax guard, dispute packet, SLA credit calculator, royalty settlement module, recognition close, or revenue forecast. It focuses on the contract drawdown boundary: whether prepaid or committed institutional revenue is actually being consumed in the right stream at the right pace, and whether the customer needs a drawdown plan, a paid amendment, or an expansion motion before the next finance checkpoint.
