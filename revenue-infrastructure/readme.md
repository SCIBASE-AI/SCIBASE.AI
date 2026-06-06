# Revenue Infrastructure

This module defines a practical revenue system for a research and event intelligence platform. It is designed to support recurring subscriptions, usage-based AI compute billing, institutional invoicing, and analytics licensing without exposing private research content or sensitive account data.

## Goals

- Create predictable recurring revenue from individuals, labs, institutions, sponsors, and data partners.
- Track usage-based AI and cloud costs before they erode margin.
- Separate private research content from licenseable aggregate metadata.
- Give finance, support, and administrators enough audit detail to resolve billing disputes.
- Keep pricing, entitlements, metering, and invoicing modular so new products can be added without rewriting the billing stack.

## Customer Segments

### Individual Pro

For freelance researchers, students, independent analysts, and small teams.

Core entitlements:
- private projects
- higher AI token allowance
- project analytics
- export tools
- priority support queue

Billing model:
- monthly or annual subscription
- optional AI compute top-ups
- cancellation and downgrade support

### Lab or Research Group

For principal investigators, lab managers, research teams, and small institutions.

Core entitlements:
- shared workspace
- group permissions
- role-based access
- shared compute pool
- private datasets
- collaboration analytics

Billing model:
- monthly or annual group subscription
- seat-based pricing
- usage alerts and auto-top-up controls
- volume discounts

### Institutional License

For universities, research institutes, government programs, funders, and enterprise research groups.

Core entitlements:
- organization administration
- SSO or managed access
- custom limits
- reporting dashboards
- data export controls
- SLA and procurement support

Billing model:
- annual contract
- institutional invoicing
- purchase-order support
- custom usage bundles

## Revenue Streams

### 1. Tiered SaaS Subscriptions

Subscription plans should map to entitlement bundles, not hard-coded features.

Recommended data objects:
- `plans`: public plan name, billing cycle, currency, base price, status
- `entitlements`: feature flags, usage limits, support level, export access
- `subscriptions`: customer, plan, renewal date, billing status, cancellation state
- `coupons`: discount code, discount type, expiration, usage limit
- `invoices`: subscription period, line items, tax, status, payment method

Minimum plan table:

| Plan | Customer | Billing | Included Usage | Primary Upgrade Trigger |
| --- | --- | --- | --- | --- |
| Free | early users | none | public projects only | private projects or AI tools |
| Pro | individuals | monthly/annual | fixed AI token pool | extra compute or exports |
| Lab | research teams | monthly/annual | shared workspace and compute pool | seats and private datasets |
| Institution | universities/government | annual invoice | custom usage bundle | SLA, SSO, analytics, procurement |

### 2. AI Compute Billing

AI usage should be metered separately from subscriptions because margin depends on model, token volume, job runtime, and cloud resources.

Metered units:
- input tokens
- output tokens
- model training minutes
- inference jobs
- reproducibility runs
- cloud execution minutes
- storage and artifact retention

Recommended data objects:
- `usage_events`: customer, workspace, job, model, unit type, quantity, cost basis, timestamp
- `usage_ledger`: aggregated daily usage by customer and workspace
- `compute_quotas`: included usage, soft limit, hard limit, alert threshold
- `top_ups`: purchased usage packs and expiration
- `cost_rates`: internal model/cloud cost assumptions

Margin guardrails:
- alert at 70 percent, 90 percent, and 100 percent of included usage
- require explicit approval before auto-scaling expensive jobs
- show estimated cost before long-running jobs
- separate internal cost from customer-facing price

### 3. Institutional Invoicing

Institutional customers often need purchase orders, annual contracts, and procurement workflows.

Recommended workflow:
1. Sales creates a quote with plan, seats, usage bundle, support tier, and term.
2. Finance approves payment terms, taxes, and procurement notes.
3. Customer accepts quote and provides purchase order if needed.
4. Invoice is generated with contract references and billing contact.
5. Access is provisioned after contract start or payment approval.
6. Renewal alerts begin 90 days before term end.

Required fields:
- legal entity name
- billing contact
- technical/admin contact
- purchase order number
- payment terms
- tax/VAT fields
- contract start and end dates
- renewal owner

### 4. Analytics and Metadata Licensing

Only aggregate, anonymized, and non-private metadata should be licenseable.

Potential products:
- citation network analytics
- dataset reuse patterns
- reproducibility scores
- research topic trends
- method usage trends
- project lineage maps
- grant/program impact dashboards

Privacy rules:
- never license private project content
- never expose identifiable researcher activity without consent
- aggregate small groups to avoid re-identification
- include data provenance and update cadence
- maintain opt-out controls where required

Licensing models:
- dashboard subscription
- API access subscription
- one-time research report
- white-labeled institutional insights portal

## Billing State Machine

```text
trialing -> active -> past_due -> grace_period -> suspended -> canceled
             |          |             |
             |          |             -> reactivated
             |          -> paid
             -> upgraded / downgraded
```

State behavior:
- `trialing`: access limited by trial entitlement policy
- `active`: plan entitlements and usage quotas are available
- `past_due`: payment failed, send billing notice and keep limited grace access
- `grace_period`: restrict expensive compute but keep project access
- `suspended`: block new compute jobs, preserve data, route to billing support
- `canceled`: stop renewal, preserve data according to retention policy

## Event Tracking

Revenue infrastructure should emit auditable events.

Core events:
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `invoice.created`
- `invoice.paid`
- `invoice.failed`
- `usage.recorded`
- `usage.threshold_reached`
- `topup.purchased`
- `entitlement.changed`
- `institutional_quote.approved`
- `license_export.generated`

Every event should include:
- customer or organization ID
- workspace ID when applicable
- actor ID or system actor
- timestamp
- source system
- idempotency key
- before/after state when relevant

## Entitlement Checks

Every paid feature should check entitlements before running expensive actions.

Example checks:
- Can this workspace create a private project?
- Can this user export analytics?
- Is this compute job within quota?
- Does this organization allow external data licensing?
- Is the customer suspended or in grace period?

If an entitlement fails:
- return a clear reason
- suggest the required plan or top-up
- do not start billable compute
- log the blocked attempt

## Implementation Milestones

### Milestone 1: Billing Model and Entitlements

Deliverables:
- plan table
- entitlement model
- subscription state machine
- billing event definitions
- admin-facing plan configuration guide

### Milestone 2: Usage Metering

Deliverables:
- AI compute usage events
- quota tracking
- daily aggregation
- usage threshold alerts
- internal margin report

### Milestone 3: Institutional Billing

Deliverables:
- quote and invoice workflow
- procurement fields
- annual contract support
- renewal reminders
- access provisioning checklist

### Milestone 4: Analytics Licensing

Deliverables:
- metadata product catalog
- privacy rules
- aggregation thresholds
- export/API entitlement checks
- license reporting workflow

## Acceptance Checklist

- A user can be assigned to a plan through a clear subscription state.
- Entitlements can be checked before private projects, exports, or compute jobs run.
- AI usage can be recorded with unit type, quantity, model/job context, and cost basis.
- Customers can receive usage alerts before exceeding included compute.
- Institutional invoices can track PO, payment terms, billing contact, and contract dates.
- Analytics licensing rules prevent private content and identifiable private activity from being exported.
- Revenue events are auditable and idempotent.

## Open Questions

- Which payment processor is primary: Stripe, PayPal, institutional invoice, or all three?
- Which AI compute units map best to current backend jobs?
- What retention policy applies after cancellation or suspension?
- Which institutional analytics products should launch first?
- What minimum aggregation threshold is acceptable for licensed metadata?
