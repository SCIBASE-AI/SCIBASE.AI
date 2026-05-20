# Requirements Map

| Issue #20 Requirement | Coverage In This Module |
| --- | --- |
| Tiered subscription billing | Subscription events can be invoiced only when order-form and admin-acceptance evidence is approved. |
| AI compute billing | Compute burst events require usage-summary acceptance before invoice readiness. |
| Licensing APIs and analytics | Data-license export waves require manifest and privacy-threshold evidence. |
| Institutional invoicing | The action queue separates ready invoices from blocked acceptance packets. |
| Usage meters and quotas | Usage-summary evidence is explicitly modeled as a required acceptance artifact. |
| Secure payment/invoice readiness | The gate prevents invoice creation when customer acceptance evidence is missing, rejected, or under review. |
| Auditability | Deterministic digest, source fields, owners, and reasons make each decision reviewable. |
| High-margin scalable operations | Finance can prioritize highest leakage-risk blockers before revenue ages out. |

## Non-Goals

- No live payment processing.
- No customer secrets or real contracts.
- No external services.
- No generic invoice ledger or subscription plan engine.
