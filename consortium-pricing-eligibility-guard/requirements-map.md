# Requirements Map

Source issue: https://github.com/SCIBASE-AI/SCIBASE.AI/issues/20

## Tiered Subscription Billing

Issue requirement: support institutional licenses, group pricing, volume-based discounts, free trials, coupons, and consortium pricing.

Delivered slice:

- validates academic consortium discount eligibility before invoice approval
- checks institutional plan tier eligibility
- prevents discount stacking beyond a configured policy limit
- produces invoice hold reasons for finance and sales review

## AI Compute Billing

Issue requirement: support quota and usage packs for high-throughput research workflows.

Delivered slice:

- keeps consortium pricing decisions separate from live usage metering
- prevents preferred institutional discount leakage before compute bundles or usage packs are invoiced
- exposes net invoice amounts for downstream revenue review

## Secure Payment and Institutional Invoicing

Issue requirement: support institutional invoicing without credential leakage.

Delivered slice:

- requires purchase-order and roster evidence before approval
- requires renewal notice evidence for preferred pricing
- emits deterministic audit packets without touching payment credentials

## Licensing APIs and Analytics

Issue requirement: support institutional and government partner monetization.

Delivered slice:

- represents consortium-specific institutional pricing as auditable metadata
- includes no private research content or live customer data
- keeps output suitable for finance review packets and customer-facing invoice holds
