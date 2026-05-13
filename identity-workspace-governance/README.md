# Identity Workspace Governance

Self-contained implementation milestone for [SCIBASE.AI issue #11](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/11).

It models the user and project management layer needed for scientific collaboration:

- linked identities across email, ORCID, Google/GitHub/OAuth, SAML, and anonymous browsing
- MFA and institutional identity assurance checks
- researcher profiles with ORCID sync fields, affiliations, keywords, activity, and reputation metrics
- project spaces containing documents, code, datasets, discussions, metadata, citations, collaborators, funding, and institutions
- role-based and object-level access evaluation
- time-limited external collaborator invitations
- project audit log with access and mutation events
- local JSON API/demo server

## Run

```bash
cd identity-workspace-governance
npm run check
npm test
npm start
```

Open `http://localhost:4322` or inspect:

```bash
curl -s http://localhost:4322/api/profile
curl -s http://localhost:4322/api/project
curl -s http://localhost:4322/api/access
curl -s http://localhost:4322/api/invitations
curl -s http://localhost:4322/api/audit
```

## Implementation Notes

The module focuses on deterministic governance behavior that can be reviewed now and later connected to real auth providers. The access engine treats role permissions, project visibility, object restrictions, identity assurance, and invitation expiry as explicit inputs.

## Files

- `src/governance.js` - identity, profile, project, access, invitation, audit, and reputation logic.
- `src/sample-data.js` - representative researcher, project, policy, invitation, and audit fixtures.
- `src/server.js` - local API and reviewer dashboard.
- `test/governance.test.js` - Node tests for core user/project management behavior.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
