# Billing Receipt Privacy Guard

Batch: billing-privacy-review-20
Generated: 2026-05-28T09:00:00Z

## Summary

- Deliverable receipts: 1
- Held receipts: 1
- Remediation actions: 1
- Total cents reviewed: 152400
- Audit digest: sha256:08e21ce3fc6915ed223f64220fdcc534986805530e3a1169f3d73ebe8860930f

## Receipt Decisions

- receipt-safe-lab-plan: deliver-receipt, findings: none
- receipt-private-compute: hold-for-finance-review, findings: collaborator-identifier, private-research-context, restricted-dataset-reference, unsafe-provider-metadata

## Remediation Actions

- remediate-receipt-private-compute: replace-private-billing-fields-before-delivery (high)

## Sparse Billing Batch Guard

Empty or partially populated provider batches that omit receipt or line-item collections produce deterministic empty review evidence instead of runtime failures. The empty batch fixture reviewed 0 receipts and generated 0 remediation actions.

## Malformed Billing Field Guard

Receipts with non-numeric totals, quantities, or line-item amounts are held before delivery. The malformed fixture decision is hold-for-finance-review, and customer-facing numeric fields are redacted to null.

## Malformed Line Item Guard

Malformed line-item entries are held before delivery instead of crashing receipt review. The malformed line-item fixture decision is hold-for-finance-review, and the customer-facing line item id is line-malformed-1.

## Malformed Billing Batch Guard

Malformed top-level billing batches are held before delivery instead of crashing receipt review. The malformed batch fixture decision is hold-for-finance-review, and the finance-review finding is malformed-billing-batch.

## Safety

All fixtures are synthetic. The guard does not call payment processors, customer systems, private workspaces, institutional finance tools, or external APIs.
