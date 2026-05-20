# Requirements Map

Issue #20 asks for a flexible revenue infrastructure that can support subscription SaaS billing, usage-based AI compute pricing, and licensing/API analytics revenue. This module adds the contract-allocation control needed when those revenue streams are sold together in one enterprise agreement.

## Tiered Subscription Billing

- Treats subscription seats as ratable performance obligations.
- Requires service-period dates before revenue can be recognized.
- Produces a monthly earned/deferred schedule for audit review.

## AI Compute Billing

- Treats compute credits as a usage-based obligation.
- Requires an estimated usage denominator before earned revenue can be calculated.
- Separates earned compute revenue from deferred compute balances.

## Licensing APIs and Analytics

- Treats analytics licenses as point-in-time obligations.
- Requires delivery evidence before recognizing license revenue.
- Keeps licensing allocation separate from subscription and compute revenue.

## Revenue Operations Controls

- Allocates bundled contract value using relative standalone selling price.
- Flags weak SSP evidence, excessive bundle discounts, excessive line discounts, missing service dates, missing usage estimates, missing delivery evidence, and incomplete material-right metadata.
- Emits deterministic audit digests and reviewer-ready recommended actions.

## Non-Goals

- No live payment processing.
- No Stripe, PayPal, bank, or Algora integration.
- No private customer, payment, or credential data.
- No replacement for accounting policy; this is a deterministic guardrail and demo module.
