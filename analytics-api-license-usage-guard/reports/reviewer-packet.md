# Analytics API License Usage Guard

As of: 2026-05-22T12:00:00.000Z
Audit digest: `56f75fde23be7ba664e9e122c1c43530a39beeb8dc3bb96db3981a20cff230f5`

## Totals

- Requests evaluated: 7
- Billable units: 120
- allow: 1
- block: 4
- throttle: 2

## Query Decisions

### query-001

- Customer: cust-nih-policy
- Dataset: citation_networks
- Topic: public_health
- Status: allow
- Billable units: 120
- Reasons: query is inside license, privacy, quota, and burst limits
- Actions: Serve anonymized analytics response; Record billable usage units

### query-002

- Customer: cust-market-intel
- Dataset: dataset_reuse
- Topic: biotech
- Status: block
- Billable units: 0
- Reasons: dataset is not included in the licensed analytics package
- Actions: Block analytics response; Log revenue and privacy audit event; Show permitted datasets, topics, and anonymization requirements

### query-003

- Customer: cust-market-intel
- Dataset: topic_trends
- Topic: biotech
- Status: block
- Billable units: 0
- Reasons: cohort size is below anonymization threshold
- Actions: Block analytics response; Log revenue and privacy audit event; Show permitted datasets, topics, and anonymization requirements

### query-004

- Customer: cust-market-intel
- Dataset: method_usage
- Topic: materials
- Status: throttle
- Billable units: 0
- Reasons: request burst exceeds licensed per-minute API limit
- Actions: Throttle query before execution; Preserve request for API usage dashboard

### query-005

- Customer: cust-market-intel
- Dataset: method_usage
- Topic: materials
- Status: throttle
- Billable units: 0
- Reasons: monthly query quota would be exceeded and overage is not authorized
- Actions: Throttle query until renewal or account approval; Offer overage authorization workflow

### query-006

- Customer: cust-expired-consortium
- Dataset: citation_networks
- Topic: open_science
- Status: block
- Billable units: 0
- Reasons: analytics API license is inactive
- Actions: Block analytics response; Log revenue and privacy audit event; Show permitted datasets, topics, and anonymization requirements

### query-007

- Customer: cust-nih-policy
- Dataset: dataset_reuse
- Topic: grant_outcomes
- Status: block
- Billable units: 0
- Reasons: query attempts to access private content rather than anonymized metadata
- Actions: Block analytics response; Log revenue and privacy audit event; Show permitted datasets, topics, and anonymization requirements
