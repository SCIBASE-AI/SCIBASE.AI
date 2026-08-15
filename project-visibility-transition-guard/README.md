# Project Visibility Transition Guard

Self-contained User & Project Management slice for
`SCIBASE-AI/SCIBASE.AI#11`.

The guard evaluates private, institutional-only, or invitation-only scientific
workspaces before they are made public. It checks required approvals,
collaborator profile consent, object-level document/code/data permissions,
sensitive labels, public readiness, active IRB/funder holds, external partner
access, and immutable audit evidence. Audit evidence now fails closed on
duplicate identifiers, unknown actors, invalid or pre-request timestamps, and
missing request/review/approval/release actions; event count alone cannot make
an unsafe transition appear review-ready.

This is intentionally separate from workspace/RBAC ledgers, privacy access
reviews, identity recovery, member lifecycle/offboarding, institutional
recertification, anonymous-review escrow, identity merge/export, data-room
consent, researcher profile sync, archive handoff, access-audit anomaly, role
delegation, invitation-domain/MFA, funding attribution, service-token governance,
deletion/erasure, break-glass access, and contribution-credit gates. Its job is
to stop unsafe public visibility transitions.

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Outputs

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`

All data is synthetic. The module does not call OAuth, SAML, ORCID, storage,
profile, permission, email, audit-log, or external services.
