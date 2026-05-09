# User & Project Management

This module is a self-contained implementation for SCIBASE.AI issue #11. It models identity, researcher profiles, project spaces, permissions, sharing, audit logs, and reputation metrics for scientific collaboration.

## What It Covers

- Authentication through email, OAuth-style linked providers, ORCID, SAML, and MFA enforcement.
- Researcher profiles with ORCID sync, affiliations, keywords, activity, citation-style reputation metrics, and public/private profile mode.
- Scientific project spaces with documents, code, datasets, discussion threads, citations, funding metadata, and archive-ready status.
- Role-based access control for Owner, Admin, Contributor, Reviewer, and Viewer.
- Object-level permissions for project, documents, code, datasets, and review scopes.
- Time-limited collaborator invitations and project-level audit logs.
- Browser dashboard and JSON API for reviewer smoke testing.

## Run Locally

```bash
cd user-project-management
npm test
npm start
```

Then open `http://localhost:4130`.

## API Surface

- `GET /api/dashboard`
- `GET /api/auth/check`
- `GET /api/users/user-alice/orcid`
- `GET /api/users/user-alice/reputation`
- `GET /api/projects/create`
- `GET /api/access/check`

## Requirement Mapping

- Authentication and identity: implemented by `authenticateIdentity`.
- ORCID/OAuth/SAML/account linking: represented in user identity links and institutional SAML metadata.
- Researcher profiles: implemented by user records, `syncOrcidProfile`, activity, keywords, and profile visibility.
- Citation and reputation metrics: implemented by `computeReputation`.
- Project spaces: implemented by `createProjectSpace` and `demoWorkspace.projects`.
- Permissions and access control: implemented by `rolePermissions`, `evaluateAccess`, and object scopes.
- External collaborators and time-limited access: implemented by `inviteCollaborator`.
- Project audit log: implemented by per-project `auditLog`.

## Verification

```bash
npm test
node src/server.js
```

Optional smoke checks:

```bash
curl -s http://localhost:4130/api/dashboard
curl -s http://localhost:4130/api/auth/check
curl -s http://localhost:4130/api/access/check
```

Demo artifacts are committed under `docs/demo/`, including `dashboard.png` and `user-project-management-demo.mp4`.
