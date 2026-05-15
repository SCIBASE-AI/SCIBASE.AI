# Research Revenue Entitlement Engine

Self-contained MVP module for issue #20, **Revenue Infrastructure**. It focuses on the rules that sit between pricing, usage, institutional billing, and privacy-safe licensing exports.

## What It Covers

- Tiered SaaS plans for labs and institutions, including monthly/annual billing, included seats, extra seat pricing, coupon rules, and volume discounts.
- AI compute metering with included credits, top-ups, overage charges, and quota status signals.
- Institutional invoice summaries with subscription, top-up, and compute overage line items.
- Entitlement checks that expose plan capabilities such as private projects, SAML, admin dashboards, SLAs, and analytics API access.
- Licensing export readiness for anonymized research metadata only, with explicit blocking of private content fields.
- Revenue health snapshot for MRR, ARR, invoice totals, and quota alerts.

## Run

```bash
npm run check
```

That runs:

```bash
npm test
npm run demo
```

Expected demo shape:

```json
{
  "invoiceId": "account-open-bio-lab:2026-05",
  "invoiceTotal": 796.6,
  "quotaStatus": "over_quota",
  "licensingReady": true
}
```

## Requirement Map

| Issue #20 requirement | Implementation evidence |
| --- | --- |
| Tiered subscription billing for individual, lab, and institutional plans | `normalizeCatalog()` and `quoteSubscription()` support plan catalogs, seats, billing cycles, included seats, extra seats, volume discounts, and coupons. |
| Monthly and annual billing cycles | Plan validation accepts `monthly` and `annual`; annual plans are converted into monthly recurring revenue for health reporting. |
| Volume discounts, free trials, coupons, and consortium pricing | `quoteSubscription()` applies volume discounts, coupon rules, and trial credits. |
| Usage-based AI compute billing | `meterAiCompute()` reconciles included credits, purchased top-ups, consumed credits, overage credits, and overage cost. |
| Transparent quotas and real-time usage meters | `quotaStatus` returns `healthy`, `near_limit`, or `over_quota`. |
| AI token top-ups | `topUps` are included in compute availability and invoice line items. |
| Institutional invoicing | `buildInstitutionInvoice()` emits invoice lines, totals, currency, entitlements, and quota state. |
| Licensing APIs and analytics for anonymized metadata | `prepareLicensingExport()` allows only approved anonymized research metadata fields and blocks private content fields. |
| Revenue health reporting | `revenueHealthSnapshot()` returns account count, MRR, ARR, invoice totals, invoices, and quota alerts. |

## Files

- `src/index.js` - revenue rules and exported functions.
- `src/cli.js` - reviewer demo command.
- `sample/revenue-fixture.json` - plan catalog, accounts, usage, top-ups, and licensing export request.
- `test/revenue-entitlement.test.js` - regression tests for plan validation, quote math, compute metering, invoices, licensing exports, and health reporting.
- `docs/demo.svg` - visual walkthrough for PR review.
- `docs/demo.mp4` - short generated video walkthrough for maintainers who prefer an inline demo artifact.

## Notes

This module is dependency-free and payment-provider-neutral. It is intended as a deterministic foundation that can later receive Stripe, PayPal, institutional invoice, and analytics API adapters.
