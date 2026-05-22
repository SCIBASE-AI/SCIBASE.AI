# Service Token Governance Guard

This module is a focused User & Project Management slice for project automation identities, service accounts, and scoped API tokens.

It evaluates whether a project token can be issued or retained by checking owner sponsorship, MFA posture, verified integrations, expiry and rotation windows, dangerous scopes, object-level permissions, restricted data grants, and immutable approval events.

## Run

```bash
npm run check
npm test
npm run demo
npm run video
```

## Outputs

- `reports/summary.json` contains the deterministic governance packet.
- `reports/owner-review-packet.md` is the maintainer-facing review queue.
- `reports/summary.svg` is a static visual summary.
- `reports/demo.mp4` is the short bounty demo video.

## Scope Boundary

This is not another broad RBAC ledger, access-audit anomaly monitor, invitation-domain guard, role-delegation guard, project archive guard, data-room consent ledger, profile sync module, or funding attribution guard. It specifically handles machine identities and API tokens before they can mutate projects, access restricted data, or publish scientific artifacts.
