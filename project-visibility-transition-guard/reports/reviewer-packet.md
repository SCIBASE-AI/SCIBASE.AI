# Project Visibility Transition Guard

Workspace: Synthetic Proteomics Collaboration
Issue: SCIBASE-AI/SCIBASE.AI#11
Transition: institutional-only -> public
Decision: block-public-visibility-transition
Score: 0

## Severity Summary

| Severity | Count |
| --- | ---: |
| critical | 8 |
| high | 8 |
| medium | 2 |
| low | 0 |

## Findings

- **critical / required-audit-action-missing**: Required audit action object-reviewed is missing.
  - Action: Record the complete request, review, approval, and release decision trail before applying visibility.
  - Refs: proj-visible-221, object-reviewed
- **critical / required-audit-action-missing**: Required audit action public-release-approved is missing.
  - Action: Record the complete request, review, approval, and release decision trail before applying visibility.
  - Refs: proj-visible-221, public-release-approved
- **critical / required-visibility-approver-missing**: Required data-steward approval is not complete.
  - Action: Block public visibility until all required governance approvers consent.
  - Refs: data-steward
- **medium / profile-exposure-consent-missing**: user-steward has no approved consent for public profile exposure.
  - Action: Hide the collaborator from public profile surfaces or collect explicit consent before transition.
  - Refs: user-steward, data-steward
- **high / profile-exposure-consent-missing**: user-partner has no approved consent for public profile exposure.
  - Action: Hide the collaborator from public profile surfaces or collect explicit consent before transition.
  - Refs: user-partner, external-partner
- **critical / sensitive-object-in-public-transition**: Raw participant proteomics table carries sensitive labels: restricted-data, human-derived.
  - Action: Exclude or redact the object before public visibility is applied.
  - Refs: obj-dataset-raw, restricted-data, human-derived
- **high / object-kind-not-public-allowlisted**: dataset object obj-dataset-raw is not allowlisted for public visibility.
  - Action: Map the object to a public-safe derivative or keep it private.
  - Refs: obj-dataset-raw, dataset
- **critical / unsafe-public-object-permission**: obj-dataset-raw would expose download permission after transition.
  - Action: Downgrade public permissions to read-only metadata or remove public access.
  - Refs: obj-dataset-raw, download
- **high / object-not-public-ready**: Raw participant proteomics table is not marked public-ready.
  - Action: Require owner/steward readiness attestation before making the object public.
  - Refs: obj-dataset-raw
- **high / unsafe-public-object-permission**: obj-code would expose edit permission after transition.
  - Action: Downgrade public permissions to read-only metadata or remove public access.
  - Refs: obj-code, edit
- **critical / sensitive-object-in-public-transition**: Anonymous reviewer discussion carries sensitive labels: anonymous-review.
  - Action: Exclude or redact the object before public visibility is applied.
  - Refs: obj-review, anonymous-review
- **high / object-kind-not-public-allowlisted**: comment-thread object obj-review is not allowlisted for public visibility.
  - Action: Map the object to a public-safe derivative or keep it private.
  - Refs: obj-review, comment-thread
- **high / object-not-public-ready**: Anonymous reviewer discussion is not marked public-ready.
  - Action: Require owner/steward readiness attestation before making the object public.
  - Refs: obj-review
- **critical / active-hold-blocks-public-transition**: IRB hold hold-irb blocks public exposure of Raw participant proteomics table.
  - Action: Block the visibility transition until the hold expires or a documented waiver is attached.
  - Refs: hold-irb, obj-dataset-raw, 2026-08-01
- **critical / active-hold-blocks-public-transition**: funder-embargo hold hold-funder blocks public exposure of Draft manuscript.
  - Action: Block the visibility transition until the hold expires or a documented waiver is attached.
  - Refs: hold-funder, obj-manuscript, 2026-06-15
- **high / external-access-principal-unknown**: External access invite-2 references unknown principal unknown-consultant.
  - Action: Revoke or identify unknown external access before public transition.
  - Refs: invite-2, unknown-consultant
- **high / external-download-without-redistribution-rights**: External access invite-2 allows downloads without redistribution rights.
  - Action: Downgrade or revoke external download grants before public visibility changes.
  - Refs: invite-2
- **medium / visibility-audit-evidence-incomplete**: Only 2 audit events are present for the transition.
  - Action: Record requester, approver, object-review, and final decision events before applying visibility.
  - Refs: proj-visible-221

## Safety

- Synthetic project, collaborator, object, hold, access, and audit data only
- No OAuth, SAML, ORCID, storage, profile, permission, email, or audit-log network calls
- No private project data, credentials, human-subject records, live users, or access-control mutations
