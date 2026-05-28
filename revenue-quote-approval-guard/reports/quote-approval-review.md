# Revenue Quote Approval Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Quotes reviewed: 4
- Approved for activation: 1
- Finance review: 0
- Held: 3
- Average quote score: 25

## Requirement Map

- Tiered subscription billing: validates seats, discounts, annual terms, and institutional order form evidence.
- AI compute billing: holds below-margin or unapproved compute packs before entitlement activation.
- Licensing APIs and analytics: requires privacy/data-use addenda before analytics license activation.
- Secure payment integrations and invoicing: reconciles quote totals, invoice lines, PO evidence, and payment currency.

## Quote Decisions

### quote-clean-institutional

- Customer: Northbridge University
- Decision: approve-activation
- Quote score: 100
- Expected quote total: 90114
- Invoice total: 90114
- Issues: 0
- Action: Activate invoice, subscription entitlements, compute credits, and analytics license from approved quote.

### quote-discount-overreach

- Customer: Helix Bio Lab
- Decision: hold-quote
- Quote score: 0
- Expected quote total: 9198
- Invoice total: 9000
- Issues: 7
- Action: Collect finance approval before invoice or entitlement activation.
- Action: Route non-standard term packet to legal.
- Action: Route non-standard term packet to finance.
- Action: Reduce lab-plan discount or collect discount exception approval.
- Action: Reprice ai-compute-pack or attach finance-approved margin exception.
- Action: Regenerate invoice from approved quote line items.
- Action: Reduce seat entitlement to approved quote scope.

### quote-invoice-drift

- Customer: Civic Climate Consortium
- Decision: hold-quote
- Quote score: 0
- Expected quote total: 193500
- Invoice total: 210000
- Issues: 7
- Action: Hold institutional invoice until PO evidence is attached.
- Action: Collect sponsor approval before invoice or entitlement activation.
- Action: Attach privacy/data-use addendum before analytics license activation.
- Action: Regenerate invoice from approved quote line items.
- Action: Remove unquoted invoice line premium-support or reapprove quote.
- Action: Hold analytics activation until quote is amended.
- Action: Align entitlement dates to signed order form dates.

### quote-missing-legal-entity

- Customer: Quantum Methods Group
- Decision: hold-quote
- Quote score: 0
- Expected quote total: 8496
- Invoice total: 8496
- Issues: 6
- Action: Hold entitlement activation until quote status is approved.
- Action: Collect legal entity before invoice creation.
- Action: Collect accounts-payable contact before quote acceptance.
- Action: Collect finance approval before invoice or entitlement activation.
- Action: Collect sponsor approval before invoice or entitlement activation.
- Action: Confirm currency and FX treatment before issuing invoice.
