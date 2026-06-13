# FX Settlement Invoice Guard Report

Summary: blocks=4, reviews=5, passes=1

## inv:lab-pro-eur-042

- Account: acct:eu-lab-17
- Currency: EUR -> USD
- Expected settlement: 2808
- Decision: RELEASE_INVOICE

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| pass | fx_settlement_ready | Invoice FX settlement, rounding, credits, and processor references are release-ready. | No remediation required. |

## inv:consortium-gbp-105

- Account: acct:uk-consortium-5
- Currency: GBP -> USD
- Expected settlement: 1905
- Decision: REVIEW_BEFORE_RELEASE

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| review | fx_snapshot_stale | FX snapshot is older than the allowed release window. | Refresh FX snapshot or attach finance approval for stale-rate usage. |
| review | fx_quote_before_invoice_window | FX quote predates invoice issue time beyond the allowed window. | Use an invoice-time quote or document policy approval. |
| review | fx_settlement_variance | Processor settlement differs from expected settlement by -0.02 USD. | Route to finance review or attach rounding-policy evidence. |

## inv:jp-enterprise-219

- Account: acct:jp-enterprise-3
- Currency: JPY -> USD
- Expected settlement: 6208
- Decision: HOLD_INVOICE

| Severity | Code | Message | Remediation |
| --- | --- | --- | --- |
| block | minor_unit_rounding_invalid | grossInvoice 1020000.55 has too many decimals for JPY. | Round grossInvoice to 0 minor units before invoice release. |
| block | minor_unit_rounding_invalid | netInvoice 970000.55 has too many decimals for JPY. | Round netInvoice to 0 minor units before invoice release. |
| review | fx_snapshot_stale | FX snapshot is older than the allowed release window. | Refresh FX snapshot or attach finance approval for stale-rate usage. |
| block | processor_reference_missing | Processor settlement reference is missing. | Attach payment processor settlement id before revenue close. |
| block | material_fx_settlement_variance | Processor settlement differs from expected settlement by -708 USD. | Attach finance approval and block release until variance is resolved. |
| review | credit_offset_approval_missing | Credit notes are applied without a credit approval id. | Attach approved credit memo before invoice release. |
