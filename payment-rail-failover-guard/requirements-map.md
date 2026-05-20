# Requirements Map

Issue #20 describes Revenue Infrastructure across tiered subscriptions, AI
compute billing, and licensing APIs. This slice maps to the payment and release
controls needed for those streams.

| Issue requirement | Implementation coverage |
| --- | --- |
| Secure payment integrations including Stripe, PayPal, and institutional invoicing | Models all three rail types plus ACH as a fallback path and evaluates availability, compatibility, and approval requirements. |
| Monthly and annual subscription billing | Uses subscription invoices as release candidates and blocks unsafe fallback attempts. |
| AI compute billing and top-ups | Evaluates compute top-up invoices separately from subscription and licensing revenue. |
| Institutional licenses and government partners | Requires purchase order evidence and supports institutional invoice release for large account types. |
| Predictable recurring revenue | Prevents duplicate charges, missing reconciliation ownership, and unsupported fallback rails from leaking into revenue release. |
| High-margin growth aligned with usage | Keeps fallback release decisions tied to account controls, settlement windows, and finance review evidence. |

## Distinct Scope

This is not another generic billing ledger, tax exemption check, FX settlement
module, dispute handler, procurement workflow, pricing experiment, contract
allocation tool, sanctions gate, or revenue forecast. It is specifically about
whether payment rail failover is safe before an invoice or AI compute top-up is
released.
