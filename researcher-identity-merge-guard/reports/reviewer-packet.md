# Researcher Identity Merge Guard Reviewer Packet

Synthetic SCIBASE community reputation packets were evaluated before identity consolidation could transfer credit, reputation, badges, or private review history.

## Decision Summary

- Total packets: 4
- Approve: 1
- Review: 1
- Hold: 2

## Packet Findings

### identity-approve-001: APPROVE_MERGE

- Verified proof types: orcid, github, institutional_email
- Projected credit delta: 17
- Findings: none
- Reviewer actions:
  - Approve merge and preserve the audit receipt on both source profiles.

### identity-hold-002: HOLD_MERGE

- Verified proof types: github
- Projected credit delta: 87
- Findings:
  - IDENTITY_EVIDENCE_MISSING (high): Fewer than two independent verified identity proofs are present.
  - ORCID_CONFLICT (critical): Profile records claim conflicting ORCID identifiers.
  - GITHUB_HANDLE_CONFLICT (high): GitHub handles conflict without a verified alias or account migration proof.
  - INSTITUTIONAL_EMAIL_UNVERIFIED (medium): Institutional email evidence is missing, unverified, or stale.
  - CREDIT_SPIKE_AFTER_MERGE (medium): Projected reputation or credit delta exceeds the configured merge allowance.
  - SOURCE_PROFILE_OBJECTION_OPEN (high): Source profile owner or collaborator objection window is not closed.
  - PRIVATE_OR_BLIND_REVIEW_LEAK (critical): The merge would expose anonymous, double-blind, or private review history.
  - AFFILIATION_APPROVAL_MISSING (high): A governed affiliation merge is missing steward approval.
  - DUPLICATE_PUBLICATION_COLLISION (high): The same artifact is claimed by both profiles with conflicting roles or credit.
  - AUDIT_RECEIPT_MISSING (medium): The merge packet lacks a durable audit receipt.
- Reviewer actions:
  - Require verified identity proof before reputation or credit transfer.
  - Request a signed GitHub alias or account migration receipt.
  - Route the packet to the institutional steward for approval.
  - Freeze public credit deltas until artifact ownership is reconciled.
  - Wait for the objection period to close and attach responses.
  - Redact private review history before any profile consolidation.
  - Generate an immutable merge receipt before approval.

### identity-review-003: REVIEW_MERGE

- Verified proof types: orcid, github, institutional_email
- Projected credit delta: 58
- Findings:
  - INSTITUTIONAL_EMAIL_UNVERIFIED (medium): Institutional email evidence is missing, unverified, or stale.
  - CREDIT_SPIKE_AFTER_MERGE (medium): Projected reputation or credit delta exceeds the configured merge allowance.
- Reviewer actions:
  - Route the packet to the institutional steward for approval.
  - Freeze public credit deltas until artifact ownership is reconciled.

### identity-hold-004: HOLD_MERGE

- Verified proof types: orcid, github, institutional_email
- Projected credit delta: 11
- Findings:
  - SOURCE_PROFILE_OBJECTION_OPEN (high): Source profile owner or collaborator objection window is not closed.
  - AFFILIATION_APPROVAL_MISSING (high): A governed affiliation merge is missing steward approval.
  - DUPLICATE_PUBLICATION_COLLISION (high): The same artifact is claimed by both profiles with conflicting roles or credit.
- Reviewer actions:
  - Wait for the objection period to close and attach responses.
  - Route the packet to the institutional steward for approval.
  - Freeze public credit deltas until artifact ownership is reconciled.
