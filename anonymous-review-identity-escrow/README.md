# Anonymous Review Identity Escrow

This is a self-contained module for SCIBASE issue #11, focused on the anonymous identity and privacy edge of User & Project Management.

The module models a privacy-preserving escrow layer for optional anonymous peer review. It gives reviewers deterministic pseudonymous handles, keeps identity-provider evidence redacted from review subjects, evaluates object-level access requests, and supports policy-controlled deanonymization only through an audited break-glass flow.

## What It Covers

- Anonymous reviewer public handles that do not reveal real names.
- Linked identity evidence for ORCID, GitHub, and institutional SAML without exposing raw subjects.
- Identity assurance scoring for MFA, institution verification, verified providers, training, and risk flags.
- Object-level project access decisions for review comments, raw data, and identity exports.
- Deanonymization requests with policy-approved reasons, quorum, due-process notice, and evidence flags.
- Audit hashes for every access decision plus a packet-level digest.

## Demo

Run npm run check, npm test, and npm run demo from this directory.

Expected demo output includes escrow-ready participants, allowed and denied grants, deanonymization approvals, and a deterministic audit digest.

The reviewer-facing visual is in docs/demo.svg; a short demo video is in docs/demo.mp4.

## Files

- src/identity-escrow.js - core deterministic escrow, access, and deanonymization logic.
- data/sample-escrow.json - synthetic sample identities, project objects, access requests, and break-glass cases.
- test/identity-escrow.test.js - Node assert coverage for pseudonyms, redaction, access denial, break-glass controls, and audit hashes.
- scripts/demo.js - terminal demo for reviewers.
- docs/requirement-map.md - maps this module to issue #11 requirements.

## Privacy Notes

No real private identity record, credential, token, ORCID secret, SAML assertion, OAuth key, or external service call is used. All identities and project data are synthetic.
