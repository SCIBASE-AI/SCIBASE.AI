# Project Invitation Expiry and Domain Guard

This focused slice adds a project invitation expiry and domain guard for User & Project Management in issue #11.

It reviews pending guest invitations before they are sent or accepted, then produces owner-facing remediation steps for risky invites.

## What it checks

- Expired invitation links.
- Email domains outside the project institution allowlist.
- Sensitive role requests.
- Missing, inactive, or unauthorized inviters.
- Duplicate outstanding invitations for the same collaborator.
- Policy receipts for allowed guest roles and sensitive roles.

## Run it

```bash
node project-invitation-expiry-domain-guard/test.js
node project-invitation-expiry-domain-guard/demo.js
```

Generated JSON, Markdown, SVG, and `demo.webm` outputs live in `project-invitation-expiry-domain-guard/reports/`.

## Why this is distinct

This is not a broad RBAC ledger, access anomaly monitor, offboarding module, institutional recertification flow, anonymous-review escrow, identity merge workflow, role delegation guard, or service-account governance guard. It focuses specifically on the pre-acceptance invitation queue.
