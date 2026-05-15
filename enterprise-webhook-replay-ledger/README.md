# Enterprise Webhook Replay Ledger

This module adds a focused enterprise integration slice for SCIBASE Enterprise
Tooling. It models signed webhook envelopes, institutional destinations, retry
windows, dead-letter queues, replay approvals, and delivery health metrics for
systems such as institutional repositories, learning management systems,
electronic lab notebooks, and funder reporting portals.

The goal is narrow: help institutional admins prove that project publication,
review, compliance, and export events were delivered or are safely queued for
reviewable replay.

## What It Covers

- Creates deterministic event envelopes with idempotency keys and audit digests.
- Applies destination-specific retry, signing, retention, and replay policies.
- Classifies deliveries into delivered, retryable, dead-letter, replay-approved,
  or manual-review states.
- Builds replay plans for failed institutional integrations.
- Produces admin dashboard metrics for webhook health and export readiness.
- Includes synthetic enterprise data, tests, a CLI demo, a requirement map, and
  a short demo video.

## Quick Start

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
Enterprise delivery health: degraded
Dead-letter events: 2
Replay-ready events: 1
Manual review events: 1
```

## Repository Layout

```text
enterprise-webhook-replay-ledger/
  data/sample-enterprise-events.json
  docs/demo.svg
  docs/demo.mp4
  docs/requirement-map.md
  scripts/demo.js
  src/webhook-ledger.js
  test/webhook-ledger.test.js
```

## Design Notes

This is not a broad enterprise dashboard or another export package generator.
It is the reliability layer that sits behind those tools:

1. SCIBASE emits a project, publication, review, compliance, or export event.
2. The ledger builds a signed, idempotent envelope for each configured
   institutional destination.
3. Delivery attempts are evaluated against retry and replay policies.
4. Failed deliveries become dead-letter records with replay prerequisites.
5. Admin metrics expose whether enterprise integrations are healthy enough for
   institutional reporting.

The functions are pure and dependency-free, so they can back a REST endpoint,
webhook worker, nightly integration report, or pull request verification step.
