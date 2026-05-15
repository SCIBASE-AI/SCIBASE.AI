# Requirement Map

| Revenue Infrastructure requirement | Implementation |
| --- | --- |
| Institutional billing | Customers include institutional tax profiles, jurisdictions, exemption certificates, and VAT/reverse-charge evidence. |
| Invoice controls | Invoices include subscription/compute line items, tax jurisdictions, tax cents, grant budget IDs, and gross amount summaries. |
| Grants and cost controls | Grant budgets enforce approved spend totals and allowed line-item categories. |
| Payment/settlement evidence | Settlement events are reconciled against invoice gross amounts before revenue can be treated as cleanly billable. |
| Compliance holds | Blockers produce `billing-hold`; warnings produce `finance-review`; clean invoices produce `billable`. |
| Auditability | Results include invoice summaries, findings, recommended actions, and a deterministic `sha256` audit digest. |

## Demo Video

The PR includes `docs/tax-exemption-demo.mp4`, a real terminal walkthrough running the local check, test, and demo scripts.
