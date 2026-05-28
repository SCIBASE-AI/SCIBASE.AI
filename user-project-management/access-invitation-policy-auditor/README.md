# Access Invitation Policy Auditor

This prototype audits invitation, role, identity, and object-level access controls for scientific project workspaces.

It checks synthetic project access records for:

- active invitations past expiry
- role escalation without owner approval
- restricted dataset download bypasses
- institutional-only access from mismatched SAML domains
- elevated roles without ORCID or institutional verification
- anonymous access to private or invitation-only projects
- invite, membership, and object-permission audit-log gaps
- restricted datasets without explicit download-deny rules
- stale external collaborators retaining elevated roles

## Run

```sh
node user-project-management/access-invitation-policy-auditor/test.js
node user-project-management/access-invitation-policy-auditor/demo.js
node user-project-management/access-invitation-policy-auditor/make-demo-video.js
```

All fixtures are synthetic. The module performs no account, identity-provider, private project, credential, SAML, ORCID, or external API access.
