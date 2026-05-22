# Collaborative Notification Visibility Guard

This module is a focused slice for issue #12, "Real-time collaborative research editor & interface." It audits the notification fanout layer for a collaborative research editor so sensitive collaboration context is not leaked through in-app alerts, email digests, push messages, or webhooks.

The guard checks whether each recipient has the required role, scope, channel allowance, digest receipt, and privacy permission before a notification is delivered. It can deliver, sanitize, hold for review, or drop each route.

## Covered Risks

- Blinded reviewer identities leaking into author notifications.
- Private section titles appearing in email digests before recipients have section access.
- Embargoed anchors leaving the editor through external channels.
- Restricted notebook paths appearing in push or email alerts.
- Private collaborator notes appearing in publication export notifications.
- External notification channels sending non-sanitized payloads without an explicit receipt.

## Files

- `index.js`: deterministic notification visibility evaluator and artifact builders.
- `sample-data.js`: synthetic collaborative editor notification batch.
- `test.js`: dependency-free assertions for routing and redaction behavior.
- `demo.js`: writes JSON, Markdown, SVG, and PPM demo artifacts into `reports/`.
- `reports/`: generated reviewer packet and demo artifacts.

## Run

```bash
npm run check
npm test
npm run demo
```

The demo produces:

- `reports/notification-visibility-packet.json`
- `reports/notification-visibility-report.md`
- `reports/summary.svg`
- `reports/demo.ppm`

The submitted PR also includes a short H.264 MP4 demo generated from the PPM frame.
