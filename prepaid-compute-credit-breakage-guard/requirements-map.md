# Requirements Map

Issue #20 describes Revenue Infrastructure for subscription billing, AI compute billing, top-ups, institutional invoices, and licensing revenue. This slice focuses on the AI compute billing/top-up close process.

| Issue requirement | Implementation coverage |
| --- | --- |
| AI compute billing and top-ups | Models prepaid AI compute credit lots, usage drawdown, expiration, and breakage review. |
| Transparent quotas and usage meters | Keeps active usable balances separate from expired breakage candidates. |
| Billing engine controls | Requires explicit terms, customer notices, refund-window closure, and dispute checks before recognizing breakage. |
| Audit-ready revenue operations | Emits deterministic JSON, Markdown, SVG, and audit digest artifacts for finance review. |
| Safe payment/revenue handling | Uses synthetic data only and performs no live payment, Stripe, PayPal, bank, or credential operations. |
