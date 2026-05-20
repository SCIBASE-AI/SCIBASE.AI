# Requirements Map

Issue #20 asks for subscription billing, AI compute billing, licensing APIs, payment integrations, and revenue operations. This module adds a compliance gate before invoices, compute usage, or licensing revenue are released.

| Requirement area | Coverage in this slice |
| --- | --- |
| Tiered subscription billing | Checks high-seat enterprise subscriptions for order-form evidence before invoice release. |
| AI compute billing | Blocks export-controlled compute without license evidence. |
| Licensing APIs and analytics | Checks analytics licensing data classes and destination jurisdictions. |
| Secure payment integrations | Validates payment rail restrictions by customer country. |
| Institutional invoicing | Emits release, hold, or block decisions with finance review packets. |
| Revenue health controls | Calculates total reviewed revenue and held or blocked revenue. |

This is separate from existing revenue slices for tax, disputes, FX, royalties, committed drawdowns, forecasting, margins, procurement, entitlement, consortium pricing, plan migration, and contract allocation.
