# Requirements Map

Issue #20 requires subscription billing, AI compute billing, licensing revenue, secure payment integrations, usage top-ups, institutional invoices, and predictable revenue operations. This submission covers the payment-to-entitlement activation boundary where real revenue leakage can happen.

| Requirement | Coverage |
| --- | --- |
| Secure payment integrations | Validates provider, signature state, replay window, and live-mode status before activation. |
| Tiered subscription billing | Converts paid orders into entitlement grants only after lifecycle checks pass. |
| AI compute billing and top-ups | Blocks duplicate AI compute credit grants for repeated paid webhooks. |
| Institutional invoices | Supports `institutional_invoice` approval/paid event streams. |
| Real-time usage/quotas | Prevents quota/top-up activation until order amount and currency match. |
| Revenue health | Emits blocker reasons and finance-ready reconciliation packets. |
| High-margin predictable revenue | Reduces double-credit, refund, dispute, and payment replay leakage. |

## Non-Goals

- This is not a general subscription ledger.
- This is not a payment rail failover module.
- This is not a dispute management workflow.
- This is not a revenue recognition close ledger.
- This is not an AI compute usage meter.
