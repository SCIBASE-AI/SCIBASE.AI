# Requirement Map

This module targets SCIBASE-AI/SCIBASE.AI issue #11, "User & Project Management".

| Issue requirement | Implementation evidence |
| --- | --- |
| Optional anonymous user mode for open peer review or public browsing | src/identity-escrow.js issues deterministic pseudonymous handles for profileMode: anonymous-review and hides real display names from review subjects. |
| Account linking across ORCID, GitHub, and institutional identity | data/sample-escrow.json models linked identity providers; scoreIdentityAssurance scores verified providers without exposing subjects. |
| Public vs private profile modes | Escrow records include profileMode and identityVisibleToReviewSubject decisions. |
| Role-based and object-level access control | evaluateAccessRequest decides project/object grants by role, requested scope, assurance score, training, and anonymous-review restrictions. |
| External collaborator and reviewer governance | Access requests model reviewer grants for invitation-only projects and restricted scientific objects. |
| Project-level audit log | Every access and deanonymization decision includes an auditEventHash; the packet includes an overall auditDigest. |
| Meaningful attribution without unsafe identity exposure | Public handles, redacted identity evidence, sealed identity hashes, and break-glass policy separate credit/trust signals from real identity release. |

## Non-goals

- No live OAuth, SAML, ORCID, payment, email, or external API integration.
- No real private identity records are included.
- No credential, secret, or production data is required.
