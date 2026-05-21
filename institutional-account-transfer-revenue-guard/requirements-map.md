# Requirements Map

| Issue #20 requirement | Coverage in this module |
| --- | --- |
| Tiered subscription billing | Evaluates subscription ownership transfer and effective-date proration between source and target plans. |
| Institutional licenses | Checks purchase-order transfer authority, budget-owner approval, SSO-domain continuity, and target organization ownership. |
| Consortium pricing | Validates active consortium roster eligibility and resets discounts to target caps. |
| AI compute billing | Moves only transferable compute credits owned by the source org and holds external or non-transferable grants. |
| Licensing APIs and analytics | Verifies analytics-license assignment and requested-scope continuity before entitlements move. |
| Secure payment or invoicing operations | Avoids live providers and instead emits finance actions for invoice holds, proration posting, and revenue-ops review. |
| Auditability | Emits deterministic JSON packet, Markdown report, SVG summary, MP4 demo, and SHA-256 audit digests. |

## Non-Overlap Notes

This slice avoids duplicating recent #20 attempts around generic billing
ledgers, AI usage metering, payment webhooks, payment failover, invoice
acceptance, sanctions/export control, FX settlement, plan migration, storage
overages, trial abuse, procurement routing, SLA credits, royalty settlement,
forecasting, and consortium-only eligibility.

The narrow contribution is the transfer decision point where an existing lab or
institution account changes legal or billing owner while existing revenue
objects need to remain reconciled.
