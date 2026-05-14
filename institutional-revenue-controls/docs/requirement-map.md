# Requirement Map

This module addresses SCIBASE issue #20 with a focused milestone for institutional revenue operations.

| Issue requirement | Implementation evidence |
| --- | --- |
| Institutional licenses and enterprise features | `sampleRevenueAccount.contract` models an institutional enterprise plan, annual cycle, SLA tier, included compute credits, licensed seats, and allowed payment rails. |
| Secure payment integrations and institutional invoicing | Purchase-order and invoice workflows model institutional invoice rails without requiring live processors. `reconcileInvoice()` and `buildApprovalRoute()` implement the control surface. |
| Volume discounts, auto-scaling plans, consortium pricing | Cost centers and POs support consortium-style split funding. Contract metadata and budget summaries provide the accounting foundation for volume/enterprise terms. |
| AI compute billing and usage meters | `usageEvents` represent priced compute and analysis usage; `priceUsageEvent()` deterministically calculates usage cost. |
| Transparent quotas and real-time usage meters | `summarizeBudgets()` projects current-period usage against approved budget limits and emits `ok`, `warn`, or `hold` states. |
| Usage packs and top-up style controls | Purchase orders and remaining balances act as prepaid institutional capacity; invoice reconciliation checks PO capacity before approval. |
| Licensing APIs and analytics | `licensingExports` models anonymized aggregate analytics products, cadence, redaction level, and pipeline amount. |
| Government and academic customers | The sample account uses a consortium contract with grant cost centers and a national research observatory licensing export. |
| Revenue health reporting | `buildRevenueControlsDashboard()` exposes open invoice revenue, licensing pipeline, budget holds, and contract metadata. |
| Auditability | `buildFinanceAuditExport()` emits deterministic evidence hashes for contracts, POs, invoice controls, and licensing exports. |
| Reviewer-ready local demo | `src/server.js` exposes health, validation, budgets, dashboard, invoice, approval-route, and audit-export endpoints. |
| Tests passing | `test/revenue-controls.test.js` covers validation, pricing, budgets, invoice reconciliation, approval routes, dashboard, audit export, and invalid references. |

## Differentiation From Existing Revenue PRs

This module is not another subscription ledger, entitlement evaluator, or usage reconciliation summary. It targets the institutional procurement workflow that enterprise research customers need before revenue can be collected: approved purchase orders, grant budgets, approval limits, invoice holds, cost-center controls, and finance audit exports.
