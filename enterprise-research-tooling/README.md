# Enterprise Research Tooling

This module implements a dependency-free enterprise tooling milestone for issue #19. It models the institutional features needed to support research organizations without requiring a database, cloud account, or paid integration.

## Capabilities

- Institutional admin dashboard with seats, projects, access posture, compliance tasks, and health alerts.
- Contributor and usage analytics for active users, storage, compute credits, repository activity, and review throughput.
- Compliance export manifests for audit logs, retention, consent, data residency, and access evidence.
- Secure API catalog with scopes, rate limits, owner metadata, and key rotation policy.
- Webhook/event delivery plan with signing, retries, dead-letter routing, and subscriber readiness.
- Formatting plugin metadata for citation, grant, manuscript, and compliance report exports.
- Local API endpoints for smoke testing and reviewer demos.

## Run locally

```bash
npm run check
npm test
PORT=4336 npm start
```

Example endpoints:

- `GET /api/admin`
- `GET /api/analytics`
- `GET /api/compliance`
- `GET /api/catalog`
- `GET /api/webhooks`
- `GET /api/plugins`
- `GET /api/dashboard`
