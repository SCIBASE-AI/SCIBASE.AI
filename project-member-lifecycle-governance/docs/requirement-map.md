# Requirement map

This module targets SCIBASE issue #11, User & Project Management, with a focused lifecycle-governance slice.

## Identity and researcher profiles

- Tracks linked identities and verification status across ORCID, SAML, GitHub, and email-style identities.
- Scores users by MFA posture, departure state, inactive state, anonymous profile mode, and unverified identities.
- Keeps profile privacy in the sample data by using synthetic names and emails only.

## Project spaces and roles

- Models project membership, owner/maintainer/reviewer/contributor roles, and object-level grants.
- Detects projects that will lose ownership continuity when owners depart or become inactive.
- Creates replacement-owner plans when active maintainers can take over.

## Object-level permissions

- Identifies sensitive grants such as dataset admin/write, notebook admin, billing approval, and review approval.
- Emits revoke actions for departing members and object-transfer actions for datasets, notebooks, and billing reports.
- Quarantines orphaned sensitive objects when no valid replacement owner exists.

## Collaborator invitations and audit logs

- Revokes expired invitations and invitations sponsored by departing/inactive members.
- Prioritizes external collaborator invitations with risk reasons.
- Generates deterministic audit digests for transfer plans, grant revocations, invitation revocations, object transfers, and blockers.

## Reviewer workflow

- `npm run check` validates transfer plans, invitation revocations, owner blockers, and audit digests.
- `npm test` covers user risk scoring, ready owner transfer, missing-owner blocking, stale invite cleanup, and deterministic evidence.
- `npm run demo` writes `docs/demo-output.json` and `docs/demo.svg`; `docs/demo.mp4` is generated from the SVG for the Algora demo-video requirement.
