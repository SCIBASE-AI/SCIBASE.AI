# Requirements Map

Issue: `SCIBASE-AI/SCIBASE.AI#20`

| Issue requirement | Implementation |
| --- | --- |
| Licensing APIs and analytics revenue | Validates named analytics dashboard/API seats against contract terms before renewal billing. |
| Institutional customers | Sample data models a consortium contract with allowed domains, seat classes, temporary access, and finance approvals. |
| Periodic analytics dashboard access | Checks active dashboard/viewer seats, inactive paid seats, duplicate identities, and temporary access expiry. |
| API access to graph metadata | Detects analytics API usage by users without API seat rights, while avoiding live query serving or API authorization. |
| Revenue infrastructure | Produces finance actions, estimated revenue exposure, and renewal true-up decisions. |
| Safe local validation | Includes dependency-free tests, demo report generation, SVG summary, and browser-generated demo video. |

## Non-goals

- No Stripe, PayPal, ACH, bank, tax, ERP, or live invoice actions.
- No SSO, SCIM, HRIS, analytics API, or dashboard provider calls.
- No private customer data, credentials, or real payment artifacts.
