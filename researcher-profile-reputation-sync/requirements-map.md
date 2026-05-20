# Requirements Map

Issue #11 asks for robust user and project management: authentication, identity, researcher profiles, project spaces, permissions, access control, and auditability. This module adds a researcher profile reputation sync guard for the profile and attribution layer.

## Authentication & Identity

- Requires verified email before reputation promotion.
- Validates canonical ORCID id format.
- Checks ORCID sync freshness so publication and affiliation data are not stale.
- Supports public, private, and anonymous review profile modes.

## Researcher Profiles

- Checks display name and research field readiness for public profiles.
- Verifies primary institutional affiliation.
- Verifies grant records for funded researchers.
- Evaluates citation, download, fork, endorsement, and reproducibility metrics.
- Detects stale reputation metric computation.

## Project Spaces

- Checks activity feed items that reference project visibility.
- Prevents private project activity from leaking into public feeds.

## Permissions & Access Control

- Enforces private-profile activity visibility.
- Enforces anonymous-review escrow and identity-hint removal.
- Produces deterministic audit digests for profile changes.

## Non-Goals

- No live ORCID, OAuth, SAML, institution, grant, or GitHub integration.
- No real researcher, project, profile, payment, or credential data.
- No replacement for workspace access controls or member lifecycle flows; this is a profile reputation and visibility guard.
