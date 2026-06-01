# Researcher Affiliation Attestation Guard

Scenario: risky-profile

Researcher: R. Example
Profile mode: public
Decision: HOLD

Reviewed 3 affiliations and 1 grants.

## Findings

- MEDIUM PUBLIC_PROFILE_WITHOUT_ORCID: R. Example has a public profile without an ORCID identifier.
- HIGH UNTRUSTED_AFFILIATION_SOURCE: Northbridge Institute affiliation uses untrusted source manual.
- HIGH EXPIRED_PUBLIC_AFFILIATION: Northbridge Institute affiliation expired on 2024-12-31.
- HIGH AFFILIATION_DOMAIN_MISMATCH: Northbridge Institute requires northbridge.edu, but no verified email matches that domain.
- MEDIUM AFFILIATION_WITHOUT_EVIDENCE: Northbridge Institute public affiliation lacks evidence references.
- HIGH AFFILIATION_DOMAIN_MISMATCH: West River Labs requires westriver.example, but no verified email matches that domain.
- HIGH AFFILIATION_DOMAIN_MISMATCH: East Valley University requires evu.example, but no verified email matches that domain.
- MEDIUM MULTIPLE_ACTIVE_PUBLIC_INSTITUTIONS: Profile has multiple active public institutions: West River Labs, East Valley University.
- HIGH GRANT_WITHOUT_PUBLIC_CONSENT: Private Foundation grant is public but consent is private.
- MEDIUM GRANT_WITHOUT_EVIDENCE: Private Foundation grant lacks evidence references.
- HIGH UNVERIFIED_AFFILIATION_USED_FOR_INVITES: Affiliation claims have blockers but are enabled for project invitation trust.
- HIGH UNVERIFIED_GRANT_USED_FOR_REPUTATION: Grant claims have blockers but are enabled for reputation scoring.

## Release Criteria

- Public affiliations come from ORCID, institutional SSO, or admin attestation.
- Expired appointments are hidden or refreshed before trust decisions.
- Verified email domains match claimed institutional affiliations.
- Public grant claims have consent and evidence references.
- Unverified affiliations and grants do not feed invitations, trust, or reputation scoring.
