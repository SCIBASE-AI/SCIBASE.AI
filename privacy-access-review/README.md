# Privacy Access Review

Self-contained User & Project Management module for SCIBASE issue #11. It focuses on the governance layer that keeps scientific workspaces usable without leaking private manuscripts, embargoed datasets, or anonymous-review identities.

## Scope

- Linked identities for email, ORCID, GitHub, Google, SAML, and anonymous reviewer profiles.
- MFA posture and institutional affiliation checks.
- Researcher profile privacy modes for public, private, institutional, and anonymous participation.
- Project visibility rules for public, private, institutional-only, and invitation-only workspaces.
- Role and object-level access decisions across manuscript, dataset, code, notebook, review, and audit objects.
- External invitation risk scoring with expiry, domain, role, and object-scope checks.
- Immutable audit evidence with deterministic hashes.
- Access-review campaign summaries for institutional admins.
- Local API endpoints and tests for reviewer validation.

No external identity provider, database, or cloud service is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4357 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4357/api/dashboard
curl -fsS 'http://localhost:4357/api/access?user=externalReviewer&object=datasetRaw&action=download'
curl -fsS 'http://localhost:4357/api/invitation?invite=externalReviewInvite'
curl -fsS http://localhost:4357/api/audit
```

## Demo Flow

1. Open `/api/dashboard` to review privacy posture, access-review findings, invitation risks, and audit evidence.
2. Open `/api/access?user=externalReviewer&object=datasetRaw&action=download` to see a denied object-level data-download decision.
3. Open `/api/access?user=owner&object=datasetRaw&action=download` to see a permitted owner decision with audit evidence.
4. Open `/api/invitation?invite=externalReviewInvite` to inspect time-limited collaborator invitation risk.

See `docs/requirement-map.md` for issue requirement coverage.
