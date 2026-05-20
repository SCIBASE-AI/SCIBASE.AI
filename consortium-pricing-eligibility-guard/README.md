# Consortium Pricing Eligibility Guard

Dependency-free revenue infrastructure slice for SCIBASE issue #20.

This module checks whether academic consortium discounts are safe to apply before an institutional invoice is issued. It focuses on a narrow part of the issue body that mentions consortium pricing, while avoiding overlap with existing generic billing, revenue recognition, dispute, FX, SLA, proration, invoice acceptance, and contract allocation submissions.

## What It Checks

- claimed consortium exists
- institution is active on the consortium roster for the invoice date
- plan tier is eligible for consortium pricing
- consortium discount does not exceed the member or consortium cap
- coupon, volume, manual, and consortium discounts do not exceed stacking limits
- dated roster evidence is attached
- renewal notice evidence is attached before preferred pricing is approved

## Run

```powershell
node consortium-pricing-eligibility-guard/test.js
node consortium-pricing-eligibility-guard/demo.js
```

The demo writes reviewer artifacts to `consortium-pricing-eligibility-guard/demo-output/`.

## Files

- `index.js` - pricing eligibility audit engine
- `test.js` - TDD coverage for held and approved invoices
- `sample-data.js` - synthetic consortiums and invoices
- `demo.js` - JSON and SVG demo artifact generator
- `requirements-map.md` - issue requirement mapping
- `acceptance-notes.md` - review notes and validation commands

## Safety

The module uses synthetic data only. It does not call Stripe, PayPal, bank APIs, institutional systems, or external services.
