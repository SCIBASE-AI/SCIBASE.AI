# Requirements Map

## Tiered Subscription Billing

- Keeps safe subscription receipts deliverable with a provider-metadata allowlist.
- Removes project titles, collaborator handles, and private research descriptors from receipt metadata.
- Scans nested provider metadata values so allowlisted keys cannot hide private workspace context.
- Redacts unsafe provider metadata key names when the key itself carries restricted dataset or private research context.
- Redacts settlement-reference, processor-settlement, bank-account, IBAN, SWIFT, ACH, SEPA, and similar payment-routing metadata before receipt delivery.
- Treats omitted provider metadata as an empty provider packet instead of crashing receipt review.
- Redacts receipt, invoice, and customer identifiers when they carry private project, dataset, or collaborator context.
- Redacts unsafe customer-facing currency labels when they carry restricted dataset context.
- Redacts unsafe customer-facing totals, quantities, and line-item amounts when they carry restricted dataset context.
- Holds receipts and redacts customer-facing totals, quantities, and line-item amounts when numeric billing fields are malformed or negative.
- Redacts customer-facing line-item identifiers and units when they carry restricted dataset context.
- Holds malformed top-level billing batches with finance-repair evidence instead of crashing receipt review.
- Holds malformed line-item entries with finance-repair evidence instead of crashing receipt review.
- Treats omitted receipt and line-item collections as empty billing evidence instead of crashing receipt review.
- Preserves customer-useful totals, billing period, plan, and invoice references after redaction.

## AI Compute Billing

- Detects private compute line items that expose restricted research project context.
- Replaces specific project descriptions with usage-category-safe customer copy.
- Holds unsafe receipts before external delivery when compute or storage lines contain restricted details.

## Licensing APIs And Analytics

- Treats analytics licensing as a billable service category without exposing private corpus details.
- Produces deterministic audit packets for finance and compliance review.
- Keeps receipt evidence synthetic and independent of live customer or payment systems.

## Safety And Scope

- Synthetic data only.
- No credentials, payment processor calls, customer systems, private workspaces, institutional finance tools, or external APIs.
- This slice is distinct from pricing, tax, disputes, payment rails, FX settlement math, invoice rounding, webhook entitlement, invoice acceptance, procurement, subscription renewal, usage reconciliation, storage overage, and analytics licensing gates.
