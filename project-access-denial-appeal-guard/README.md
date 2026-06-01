# Project Access Denial and Appeal Guard

Self-contained synthetic module for SCIBASE issue #11, User & Project Management.

The guard focuses on a narrow decision point: denied restricted-project access requests and appeal packets should be fair, timely, independently reviewed, requester-safe, and auditable before the final user-facing decision is sent.

## What It Checks

- Stable denied access request ids and requester ids.
- Specific denial reason codes and rationales.
- Requester-safe redaction of private denial and appeal notes.
- Appeal submission inside the configured appeal window.
- Independent appeal reviewer identity and eligible governance role.
- Required training, data-use agreement, and IRB evidence by project classification.
- Least-privilege object scope for restricted projects.
- User-facing audit receipts with reason code, appeal deadline, evidence checklist, decision timestamp, and appeal outcome.

This is distinct from broad RBAC ledgers, privacy access review campaigns, member offboarding, break-glass access, collaborator conflict checks, data-residency transfers, and object-permission drift. It is specifically about the post-denial appeal workflow and the receipt that a denied researcher receives.

## Run

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

## Outputs

`npm run demo` writes:

- `reports/clean-audit.json`
- `reports/risky-audit.json`
- `reports/risky-review.md`
- `reports/summary.svg`
- `reports/manifest.json`
- `reports/demo.mp4`

The sample data is synthetic only. The module does not call identity providers, SAML/OAuth/ORCID services, GitHub, payment processors, private user/project systems, or external APIs.
