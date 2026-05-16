# Enterprise SLA Uptime Monitor

A self-contained Enterprise Tooling slice for SCIBASE issue #19. It converts synthetic uptime checks, incident records, webhook delivery outcomes, and export jobs into a deterministic admin review packet for institutional reliability governance.

This module is intentionally narrow: it does **not** replace the existing admin-dashboard, export, trust-center, data-residency, identity-drift, legal-hold, webhook-replay, or grant-compliance submissions. It focuses only on service-level commitments, error-budget posture, webhook reliability notices, and whether SLA evidence can be exported safely.

## What it does

- Computes per-service uptime against tenant SLA targets.
- Tracks unplanned downtime, planned maintenance, MTTR, incident counts, and error-budget remaining minutes.
- Flags `breach`, `watch`, and `within_sla` service states.
- Reviews webhook destinations with elevated failure rates or dependencies on breached services.
- Blocks evidence exports that would report on a breached service before an admin review.
- Produces a SHA-256 evidence digest over the deterministic packet for audit trails.

## Files

- `src/sla-uptime-monitor.js` — local evaluator and helper functions.
- `data/sample-sla-input.json` — synthetic tenant/service/incidents/webhook/export data.
- `scripts/demo.js` — terminal demo that prints the admin metrics and action queue.
- `test/sla-uptime-monitor.test.js` — Node test suite covering breach/watch/ready decisions and deterministic digests.
- `docs/requirement-map.md` — mapping back to issue #19 Enterprise Tooling requirements.
- `docs/demo.svg` — static dashboard-style preview.

## Run locally

```bash
npm run check
npm test
npm run demo
```

Expected demo summary:

```text
SCIBASE Enterprise SLA Uptime Monitor
Services: 3
Breaches: 1
Watch: 1
Blocked exports: 1
Queued actions: 4
```

## Safety and privacy

The module uses only synthetic data and Node built-ins. It performs no network calls, requires no account credentials, and stores no secrets. It is suitable for offline review and CI.
