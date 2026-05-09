# SCIBASE.AI Revenue Infrastructure

Self-contained implementation for issue #20. The module models the revenue layers SCIBASE needs for sustainable commercial operation:

- Tiered SaaS subscriptions for individual researchers, labs, and institutions
- Monthly and annual billing with trial periods, coupons, volume discounts, and seat expansion
- Usage-based AI compute billing for tokens, compute minutes, reproducibility runs, storage, and licensing API calls
- Top-up credits that offset compute or licensing overages before tax
- Stripe, PayPal, and institutional invoice provider routing
- Entitlement checks for features, quotas, and plan access
- Privacy-safe licensing exports for policy, funding, and meta-research customers
- Interactive demo dashboard and JSON APIs for reviewer smoke tests

## Run locally

```bash
cd revenue-infrastructure
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run typecheck
npm test
```

## Demo artifact

- `docs/demo/dashboard.png`
- `docs/demo/revenue-infrastructure-demo.mp4`

The MP4 is intentionally small so it can be linked directly from a pull request while still showing the runnable dashboard.

## Demo API

Generate an invoice:

```bash
curl -s http://localhost:3000/api/invoices/generate \
  -H 'content-type: application/json' \
  -d '{
    "accountId": "acct_institution_eu",
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-06-01T00:00:00.000Z"
  }' | jq .
```

Check an entitlement:

```bash
curl -s http://localhost:3000/api/entitlements/check \
  -H 'content-type: application/json' \
  -d '{
    "accountId": "acct_lab_quantum",
    "feature": "group_permissions",
    "metric": "compute_minutes",
    "requestedQuantity": 10,
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-06-01T00:00:00.000Z"
  }' | jq .
```

Preview privacy-safe licensing data:

```bash
curl -s 'http://localhost:3000/api/licensing/export?contractId=lic_eu_001' | jq .
```

## Architecture

The implementation is intentionally framework-light so it can be reviewed quickly:

- `src/lib/billing-engine.ts` calculates subscription, usage, discounts, credits, tax, due dates, and invoice IDs.
- `src/lib/revenue-service.ts` exposes account, usage, top-up, entitlement, invoice, and analytics operations.
- `src/lib/licensing-engine.ts` builds aggregated licensing exports and excludes private research metadata.
- `src/server.ts` serves the demo UI and REST endpoints.
- `tests/` covers billing, entitlement, usage, revenue summary, and licensing privacy behavior.

## Production integration notes

The payment-provider routing is isolated behind invoice provider metadata:

- `stripe` and `paypal` invoices emit a hosted payment URL placeholder that can be replaced by real checkout-session creation.
- `institutional_invoice` invoices omit hosted payment URLs and include procurement instructions.
- Webhook handlers should persist provider event IDs and use the deterministic invoice ID as the idempotency key.
- Licensing exports are aggregated only; events marked `containsPrivateContent` are never included in output rows.

Known follow-ups for production:

- Persist accounts, invoices, top-ups, and usage events in the SCIBASE database.
- Replace demo seed data with authenticated organization context.
- Add real Stripe, PayPal, and invoice-provider adapters.
- Add admin authorization and audit logs around pricing and export access.
