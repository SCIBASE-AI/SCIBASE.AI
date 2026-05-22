# Enterprise Admin Alert Escalation Guard

This module is a dependency-free, synthetic-data-only guard for SCIBASE
Enterprise Tooling. It validates whether enterprise admin alerts can safely be
muted, digested, throttled, or routed through webhooks without hiding
compliance, security, export, or integration obligations.

## What It Checks

- Critical or high-severity alerts delayed by digest settings.
- Urgent alerts muted by owner preferences.
- Quiet-hours overrides for compliance and security alerts.
- Alerts routed to inactive owners or admins on leave.
- Required webhook routes with unhealthy failure rates.
- Duplicate suppression near compliance or export deadlines.
- Missing delivery channels for admin dashboard events.

## Local Commands

```bash
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts under `reports/`:

- `admin-alert-escalation-packet.json`
- `admin-alert-escalation-report.md`
- `summary.svg`
- `demo.mp4`

## Requirements Map

| Issue #19 capability | Coverage in this slice |
| --- | --- |
| Admin dashboards | Emits dashboard badges for digest bypass, owner fallback, webhook fallback, and visible deadlines. |
| Compliance tracking | Keeps compliance, security, IRB, and export obligations visible until acknowledged. |
| API and webhooks | Emits webhook-ready event summaries without delivering live webhooks. |
| Enterprise governance | Enforces owner fallback, quiet-hours override, and duplicate-suppression safety for institutional admins. |

## Safety Boundaries

- Uses only synthetic fixtures in `sample-data.js`.
- Does not deliver live email, SMS, Slack, webhook, or external provider
  notifications.
- Does not include real institutional alerts, private users, credentials, or
  project data.
