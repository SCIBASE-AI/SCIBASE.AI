# Requirement Map

Issue #20 asks for modular revenue infrastructure spanning subscription billing, AI compute usage, secure payment integrations, institutional invoicing, and licensing/analytics monetization. This slice targets cross-border settlement after a customer invoice is paid but before base-currency revenue is posted.

| Issue requirement | Coverage in this module |
| --- | --- |
| Secure payment integrations | Requires provider remittance references and detects duplicate provider references before cash application. |
| Institutional invoicing | Ties each settlement to an invoice id, customer id, invoice currency, invoice date, and settlement date. |
| Predictable recurring revenue and high margins | Calculates expected base revenue, provider fees, net remittance, FX variance, and booking variance in cents. |
| AI compute and analytics monetization | Supports any invoice stream, including compute top-ups, subscription invoices, and analytics-license invoices, without touching live rails. |
| Compliance and audit readiness | Requires cross-border tax evidence, rate books, source counts, deterministic audit digests, and finance actions. |
| International customers and partners | Handles non-USD invoices and base-currency settlement using dated FX rate books. |

## Non-Goals

- Does not call Stripe, PayPal, banks, Algora, or exchange-rate APIs.
- Does not store real customer, payment, or bank data.
- Does not duplicate existing plan migration, partner royalty, tax exemption, pricing experiment, dispute, SLA, forecast, drawdown, procurement, renewal, or margin modules.
