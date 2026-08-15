# Project Ownership Succession Guard Report

Generated: 2026-08-15T21:45:36.455Z
Packets analyzed: 4
Decision counts: APPROVE 1, REVIEW 1, HOLD 2

## Findings

### succession-approve-001: Departed PI transfer to verified co-owner with full notice

Decision: APPROVE
Risk score: 0
Succession trigger: yes
Compliance hold: no

- No succession risk detected.

Recommended actions:
- Approve the ownership transfer and retain the succession receipt.

### succession-hold-002: Contributor attempts takeover without independent approval

Decision: HOLD
Risk score: 100
Succession trigger: no
Compliance hold: no

- CRITICAL NO_VALID_SUCCESSION_TRIGGER: The packet does not show a valid owner inactivity, departure, or succession trigger.
- CRITICAL PROPOSED_OWNER_ROLE_INELIGIBLE: The proposed owner lacks a succession-eligible project role.
- MAJOR SUCCESSOR_IDENTITY_POSTURE_INSUFFICIENT: The proposed owner does not have current verified identity and MFA evidence.
- CRITICAL INDEPENDENT_SUCCESSION_APPROVAL_MISSING: Ownership transfer lacks an independent institutional, data-steward, quorum, or legal approval path.
- MAJOR COLLABORATOR_SUCCESSION_NOTICE_INCOMPLETE: Not all collaborators were notified about the ownership succession request.
- MAJOR OBJECTION_WINDOW_TOO_SHORT: The collaborator objection window is too short for a project ownership transfer.
- MAJOR ORIGINAL_OWNER_ATTRIBUTION_NOT_PRESERVED: The transfer packet does not preserve original owner credit, contribution history, and a public transfer receipt.
- CRITICAL COMPETING_OWNERSHIP_CLAIM_UNRESOLVED: The transfer has an unresolved ownership dispute or competing successor claim.
- MAJOR IMMUTABLE_TRANSFER_AUDIT_RECEIPT_MISSING: The succession packet lacks an immutable audit receipt.

Recommended actions:
- Freeze owner-only project actions until the succession packet is resolved.
- Route the packet to independent governance review.
- Preserve original owner attribution and collaborator notice evidence.

### succession-hold-003: Clinical dataset project transfer missing compliance signoff

Decision: HOLD
Risk score: 35
Succession trigger: yes
Compliance hold: yes

- CRITICAL COMPLIANCE_HOLD_TRANSFER_APPROVAL_MISSING: The project has regulated-data, IRB, DUA, embargo, clinical, or export-control holds without compliance approval.

Recommended actions:
- Keep regulated datasets and embargoed artifacts locked until compliance approval is recorded.
- Freeze owner-only project actions until the succession packet is resolved.
- Route the packet to independent governance review.
- Preserve original owner attribution and collaborator notice evidence.

### succession-review-004: Eligible successor with short notice window and missing receipt

Decision: REVIEW
Risk score: 44
Succession trigger: yes
Compliance hold: no

- MAJOR OBJECTION_WINDOW_TOO_SHORT: The collaborator objection window is too short for a project ownership transfer.
- MAJOR IMMUTABLE_TRANSFER_AUDIT_RECEIPT_MISSING: The succession packet lacks an immutable audit receipt.

Recommended actions:
- Freeze owner-only project actions until the succession packet is resolved.
- Route the packet to independent governance review.
- Preserve original owner attribution and collaborator notice evidence.
