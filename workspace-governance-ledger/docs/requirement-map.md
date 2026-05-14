# Requirement Map

## Authentication and identity

- `buildResearcherProfile` exposes linked identity providers, verification status, and MFA state.
- Sample identities cover ORCID, GitHub, and SAML-style institutional login.

## Researcher profiles

- Profiles include institution, fields, visibility mode, linked identities, and reputation metrics.
- `calculateReputation` combines downloads, peer reviews, reproducibility, and endorsements.

## Project spaces

- `buildProjectSpace` summarizes documents, datasets, code assets, discussions, metadata, and collaborators.

## Permissions and access control

- `evaluateAccess` enforces role requirements for view, review, edit, invite, and archive actions.
- Object-level resource permissions restrict edits on sensitive datasets.

## External collaboration

- `createInvitation` builds external reviewer invitations with role, inviter, status, and expiry metadata.

## Audit logging

- `buildAuditTrail` returns ordered project governance events with actor, action, target, and timestamp.
