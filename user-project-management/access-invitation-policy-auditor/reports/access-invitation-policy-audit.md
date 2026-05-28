# Access Invitation Policy Audit: Clinical Biomarker Collaboration Workspace

- Decision: hold-project-access
- Risk score: 100
- Visibility: institutional-only
- Invitations reviewed: 2
- Memberships reviewed: 4
- Object permissions reviewed: 3
- Audit digest: 9164efd10da8a9b9

## Findings

- [critical] EXPIRED_INVITE_ACTIVE (external-ravi)
  - Invitation invite-001 is active after expiry 2026-05-20T00:00:00Z.
  - Recommendation: Disable the invitation and rotate the access token.
- [high] ROLE_ESCALATION_WITHOUT_APPROVAL (external-ravi)
  - Invitation invite-001 grants admin after reviewer request without owner approval.
  - Recommendation: Require owner approval before increasing collaborator role scope.
- [high] UNVERIFIED_IDENTITY_PRIVILEGE (external-ravi)
  - external-ravi has elevated role admin without verified ORCID or SAML identity.
  - Recommendation: Require ORCID or institutional verification before granting elevated roles.
- [medium] AUDIT_LOG_GAP (external-ravi)
  - Invitation invite-001 has no immutable audit-log event.
  - Recommendation: Write an immutable audit-log event for every invite, role, and object-permission change.
- [critical] INSTITUTION_SCOPE_MISMATCH (external-ravi)
  - external-ravi has institutional-only access without matching verified SAML domain.
  - Recommendation: Restrict institutional-only access to verified SAML domains.
- [medium] STALE_EXTERNAL_COLLABORATOR (external-ravi)
  - External collaborator external-ravi has 57 inactive days with admin role.
  - Recommendation: Expire external collaborator access after inactivity or invite window close.
- [medium] AUDIT_LOG_GAP (external-ravi)
  - Membership external-ravi/admin has no role audit-log event.
  - Recommendation: Write an immutable audit-log event for every invite, role, and object-permission change.
- [critical] INSTITUTION_SCOPE_MISMATCH (guest-anon)
  - guest-anon has institutional-only access without matching verified SAML domain.
  - Recommendation: Restrict institutional-only access to verified SAML domains.
- [critical] ANONYMOUS_PRIVATE_ACCESS (guest-anon)
  - Anonymous membership guest-anon can access institutional-only project.
  - Recommendation: Block anonymous sessions from private or invitation-only workspaces.
- [medium] AUDIT_LOG_GAP (guest-anon)
  - Membership guest-anon/viewer has no role audit-log event.
  - Recommendation: Write an immutable audit-log event for every invite, role, and object-permission change.
- [critical] INSTITUTION_SCOPE_MISMATCH (partner-lee)
  - partner-lee has institutional-only access without matching verified SAML domain.
  - Recommendation: Restrict institutional-only access to verified SAML domains.
- [critical] OBJECT_PERMISSION_BYPASS (external-ravi)
  - external-ravi can download restricted dataset dataset-phi-raw.
  - Recommendation: Apply object-level deny rules before project-level role grants.
- [high] DATA_DOWNLOAD_NOT_RESTRICTED (external-ravi)
  - dataset-phi-raw lacks explicit download deny for external-ravi.
  - Recommendation: Set explicit deny-download policy for restricted datasets.
- [low] AUDIT_LOG_GAP (external-ravi)
  - Object permission rule-001 has no audit-log event.
  - Recommendation: Write an immutable audit-log event for every invite, role, and object-permission change.
- [high] DATA_DOWNLOAD_NOT_RESTRICTED (partner-lee)
  - dataset-consent-linkage lacks explicit download deny for partner-lee.
  - Recommendation: Set explicit deny-download policy for restricted datasets.
- [low] AUDIT_LOG_GAP (partner-lee)
  - Object permission rule-002 has no audit-log event.
  - Recommendation: Write an immutable audit-log event for every invite, role, and object-permission change.

## Access Gates

- [!] Invitations expire and cannot silently escalate roles.
- [!] Institutional and private workspaces reject anonymous or mismatched identities.
- [!] Restricted datasets cannot be downloaded by object-permission bypass.
- [!] Elevated roles require verified identity.
- [!] Invite, membership, and object-permission changes are audit logged.
