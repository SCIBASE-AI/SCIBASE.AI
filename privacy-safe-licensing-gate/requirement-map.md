# Requirement Map

This maps the privacy-safe licensing gate to the Revenue Infrastructure bounty in `SCIBASE-AI/SCIBASE.AI#20`.

| Bounty requirement | Coverage in this module |
| --- | --- |
| Licensing APIs and analytics | `buildLicensingReadinessReport` creates package-level readiness decisions for analytics products that can be exposed through an API or dashboard. |
| Monetize structured, anonymized usage and research metadata | Candidate packages are evaluated as aggregated metadata products, and ready packages contribute to `eligibleMonthlyRevenue`. |
| Never private content | `evaluatePackage` blocks `privateContentIncluded`, direct identifiers, and configured forbidden fields before a package is marked ready. |
| Customers such as agencies, consortia, funders, and intelligence teams | Package records include customer segment and licensing purpose, and the default policy accepts only explicit institutional analytics purposes. |
| Dashboard, API, and white-label licensing options | Decisions include `allowedChannels`, `recommendedHoldActions`, and package summaries that can feed dashboards, API responses, or white-label exports. |
| Revenue infrastructure without live payment handling | The module estimates licensing readiness and revenue eligibility only. It does not integrate with Stripe, PayPal, banks, tax forms, wallets, or payout credentials. |
| Reviewer-ready local validation | Node test coverage and the demo script run locally without network access or secrets. |

## Scope Boundaries

- This is not a payment processor integration.
- This is not a customer identity or tax workflow.
- This does not export raw project documents, notebooks, messages, or files.
- This is intentionally self-contained so it can be reviewed without provisioning external services.
