# Acceptance Notes

This #20 slice focuses specifically on privacy-safe billing artifacts before invoices, receipts, and provider metadata leave SCIBASE.

It is not:

- a broad revenue infrastructure module
- a subscription entitlement or renewal guard
- a tax, procurement, or invoice-acceptance workflow
- a payment-rail failover or webhook entitlement verifier
- an analytics licensing export gate
- a revenue dispute, reconciliation, or credit-breakage ledger

Validation coverage:

- safe receipts are deliverable with only allowed provider metadata
- private research project context is removed from customer-facing receipt line items
- restricted dataset details are replaced with usage-category-safe wording
- receipt, invoice, and customer identifiers are redacted when they expose private context
- redacted receipt identifiers remain distinct for finance review correlation
- customer-facing currency labels are replaced with `XXX` when they carry restricted dataset context
- customer-facing totals, quantities, and line-item amounts are replaced with `null` when they carry restricted dataset context
- customer-facing totals, quantities, and line-item amounts are replaced with `null` when they are malformed or negative, even without private research text
- malformed top-level billing batches are held with `malformed-billing-batch` findings instead of crashing receipt review
- malformed line-item entries are held with `malformed-line-item` findings instead of crashing receipt review
- customer-facing line-item identifiers and units are redacted when they contain restricted dataset context
- missing provider metadata is treated as an empty provider packet instead of crashing receipt review
- missing receipt and line-item collections are treated as empty billing evidence instead of crashing receipt review
- unsafe provider metadata keys are removed before delivery
- unsafe provider metadata key names are redacted when the key itself carries restricted dataset context
- settlement-reference, processor-settlement, bank-account, IBAN, SWIFT, ACH, SEPA, and similar payment-routing metadata key names are redacted before delivery
- allowlisted provider metadata keys are still scanned when values are structured or nested
- customer copies retain useful totals, currency, usage categories, quantities, and units
- audit digests are deterministic and private-context free
