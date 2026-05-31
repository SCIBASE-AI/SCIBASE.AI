# Cancellation Effective-Date Guard Report

Account: inst-lab-204
Cancellation: can-2026-05-alpha
Decision: block-cancellation-close

| Severity | Finding | Action |
| --- | --- | --- |
| hold | Cancellation notice provides 17 days, below the required 30 days. | Route to finance/legal for late-notice approval before suppressing renewal revenue. |
| block | Cancellation effective date differs from the contract end date without early-termination approval. | Attach early-termination approval or align the effective date with the contract end date. |
| block | Renewal invoice inv-renew-991 is still scheduled after cancellation takes effect. | Cancel or hold the renewal invoice before finalizing the cancellation. |
| hold | A refund or service credit is due but no finance review is attached. | Create a finance review before issuing credit notes or refund payments. |
| hold | Compute credit lot cc-ai-771 remains usable after the wind-down date. | Expire, refund, or convert the remaining compute credits before cancellation close. |
| block | Analytics export grant lic-export-44 outlives the cancellation cutoff. | Revoke or shorten export access before confirming cancellation. |
| hold | Institutional purchase-order exception is present without a closeout record. | Attach PO closeout evidence before marking the account cancelled. |
