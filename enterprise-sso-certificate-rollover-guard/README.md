# Enterprise SSO Certificate Rollover Guard

This module adds a focused Enterprise Tooling control for SCIBASE issue #19. It evaluates synthetic SAML/SSO metadata before an institutional identity-provider certificate change is released to researchers, admins, exports, or API/webhook consumers.

The guard is intentionally narrow. It does not call an identity provider, SCIM endpoint, HRIS, payment system, repository, webhook destination, or private SCIBASE tenant. It only reviews local synthetic evidence for certificate expiration, rollover overlap, signing algorithm safety, metadata freshness, endpoint drift, emergency fallback testing, and admin notification readiness.

## What It Catches

- Primary signing certificates that are inside the rotation window or past the hard stop.
- Rollover plans without a staged certificate or without sufficient overlap.
- Unsafe or weak signing material, such as SHA-1 signatures or undersized RSA keys.
- IdP metadata that has not been refreshed recently enough for a release decision.
- ACS/entity ID drift that could break enterprise SSO after rollout.
- Missing owner, notification, ticket, or fallback-login evidence.
- Connected enterprise systems that have stale SSO metadata refresh evidence.

## Outputs

- Tenant-level release decisions: `clear`, `rotate_before_expiry`, `hold_rollover`, or `block_metadata_release`.
- Deterministic findings with severity, evidence, and remediation.
- A reviewer packet digest for repeatable audit comparison.
- JSON, Markdown, SVG, and MP4 demo artifacts under `reports/`.

## Usage

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/rollover-review-packet.json`
- `reports/rollover-review-report.md`
- `reports/summary.svg`
- `reports/demo.mp4` when `ffmpeg` is available

## Scope Boundaries

This is separate from existing issue #19 work on SCIM deprovisioning, broad identity provisioning drift, webhook delivery/redaction, API rate limits, integration contract drift, admin dashboards, repository sync SLAs, connector certification, vendor DPA review, and secret rotation. The guard focuses only on enterprise SSO certificate rollover readiness before metadata is released.
