# Enterprise Compliance Evidence Packets

This module adds a deterministic enterprise evidence packet engine for institutional research offices. It is a focused slice of the Enterprise Tooling issue: turn project metadata, compliance evidence, and export target configuration into an audit-ready packet that an administrator can review before pushing research outputs to repositories, funder portals, or preprint systems.

The implementation is self-contained and uses only Node.js built-ins.

## What It Covers

- Compliance evidence checks for open access, data availability, reproducibility score, AI review completion, version history, and ORCID coverage.
- Export readiness decisions for configured enterprise targets such as institutional repositories, funder reports, and preprint systems.
- Stable evidence digests so reviewers can tell when a packet's underlying evidence changed.
- Webhook-safe event envelopes with optional HMAC signatures for downstream systems.
- Markdown and JSON output for demos, review packets, or API integration.

## Requirement Mapping

- Admin oversight: `buildDashboard()` summarizes ready, review, and blocked projects across departments.
- Compliance tracking: `evaluateProject()` records missing evidence and severity per project.
- API and webhooks: `createWebhookEnvelope()` produces deterministic event payloads that can be signed for external systems.
- Export pipelines: `buildExportPlan()` verifies each required target before export.
- Institution tags and reporting: packets preserve department and custom tags for internal initiatives.

## Run The Demo

```bash
cd enterprise-compliance-evidence-packets
npm run demo
```

For JSON output:

```bash
npm run demo:json
```

## Run Tests

```bash
cd enterprise-compliance-evidence-packets
npm test
```

The tests cover packet status decisions, compliance gap detection, stable evidence digests, target filtering, and webhook signing.
