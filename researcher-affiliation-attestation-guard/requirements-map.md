# Requirements Map

Issue #11 asks for user and project management: authentication and identity, researcher profiles, project spaces, permissions, activity/reputation metrics, public/private profile modes, institutional login, ORCID sync, funding sources, and collaboration governance.

This slice covers a focused profile-trust gate:

- Authentication and identity: validates that public affiliation claims come from ORCID, institutional SSO, or admin attestation.
- Researcher profiles: checks public affiliation and grant claims before they appear on a public profile.
- Institutional login: verifies institutional email domains match claimed public affiliations.
- Funding sources: requires public grant claims to carry consent and evidence references.
- Reputation metrics: blocks unverified affiliations or grants from feeding invitation trust or reputation scoring.
- Public/private modes: flags visibility mismatches between private profiles and public reputation badges.

Out of scope by design: broad RBAC, project visibility transitions, object-level permissions, invitation MFA, lifecycle offboarding, data residency, profile publication disambiguation, and access denial appeals, because those are already covered by separate same-issue slices.
