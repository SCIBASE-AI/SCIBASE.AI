# Research Consent Access Broker

Self-contained User & Project Management module for SCIBASE issue #11.

This slice focuses on consent-aware project access rather than another broad RBAC demo. It models how scientific project spaces can grant or hold access when a researcher, external collaborator, anonymous reviewer, or institutional partner touches sensitive datasets, notebooks, manuscripts, exports, and review approvals.

## Capabilities

- Links email, ORCID, OAuth, SAML domain, and anonymous reviewer identities.
- Enforces MFA posture for sensitive project roles.
- Evaluates project membership and object-level grants.
- Checks consent records by protocol, data category, allowed purpose, and revocation state.
- Checks data-use agreements by institution, protocol, expiry, export permission, and reviewer clauses.
- Checks IRB approval expiry and protocol status before access is allowed.
- Blocks anonymous reviewers from private datasets while still allowing blinded manuscript review.
- Produces deterministic audit digests for reviewer evidence.
- Emits stale invitation and grant-drift actions for project admins.

## Run locally

```bash
cd research-consent-access-broker
npm run check
npm test
npm run demo
```

The demo writes:

- `docs/demo-output.json`
- `docs/demo-transcript.md`

## Files

- `src/consent-access-broker.js` - access engine and audit helpers.
- `data/sample-workspace.json` - synthetic identities, projects, protocols, DUAs, objects, and invitations.
- `test/consent-access-broker.test.js` - dependency-free Node tests.
- `scripts/check.js` - static integrity checks for the module.
- `scripts/demo.js` - reviewer-facing demo report generator.
- `docs/requirement-map.md` - mapping back to issue #11 acceptance areas.

## Safety

All data is synthetic. No live OAuth, SAML, ORCID, payment, email, or project credentials are used.
