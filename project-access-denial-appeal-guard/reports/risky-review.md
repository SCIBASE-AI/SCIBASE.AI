# Project Access Denial and Appeal Guard

Packet: risky-access-appeals
Status: HOLD
Fingerprint: fde2d21c50c6dd89

## Summary

Hold final access decisions: 12 critical or high denial/appeal governance blocker(s) need remediation.

## Appeal Decisions

- AR-2002: hold-decision; 14 finding(s)
  - Requester: researcher-99; project proj-human-cohort-9
  - Appeal state: submitted; receipt missing

## Findings

- CRITICAL APPROVAL_WITH_MISSING_RESTRICTED_EVIDENCE: AR-2002 approves restricted human-data access while evidence is missing: duaActive, irbApproval.
  - Evidence: Restricted access appeals cannot override training, DUA, or IRB prerequisites.
  - Remediation: Hold approval until all restricted-data prerequisites are present and current.
- CRITICAL PRIVATE_APPEAL_NOTE_EXPOSED: AR-2002 appeal includes private notes without requester-safe redaction.
  - Evidence: Appeal responses must not reveal private collaborator notes or hidden institutional risk comments.
  - Remediation: Redact private notes and publish only requester-safe appeal rationale.
- CRITICAL PRIVATE_DENIAL_NOTE_EXPOSED: AR-2002 has private denial notes without requester-safe redaction.
  - Evidence: Denied-access notices must not leak hidden reviewer comments, protected collaborator details, or institutional security notes.
  - Remediation: Redact private notes and expose only a requester-safe reason code plus remediation checklist.
- HIGH APPEAL_REVIEWER_NOT_INDEPENDENT: AR-2002 appeal is reviewed by the same actor who denied access.
  - Evidence: Appeals require independence from the original denial decision.
  - Remediation: Assign an independent data steward, institution admin, or ethics reviewer.
- HIGH APPEAL_REVIEWER_ROLE_NOT_ELIGIBLE: AR-2002 appeal reviewer role viewer is not eligible.
  - Evidence: Eligible appeal reviewer roles: data-steward, institution-admin, ethics-reviewer.
  - Remediation: Assign a reviewer with an eligible governance role or document a policy exception.
- HIGH APPEAL_WINDOW_EXPIRED: AR-2002 appeal was submitted after the 14-day appeal window.
  - Evidence: Late appeals need explicit exception approval before a denial decision is changed.
  - Remediation: Route to institution-admin exception review or keep the denial final with a clear late-appeal receipt.
- HIGH BROAD_RESTRICTED_SCOPE_REQUEST: AR-2002 requests broad access to a non-public project.
  - Evidence: Restricted projects should appeal access at the narrowest object and permission scope that supports the research need.
  - Remediation: Replace all-project scope with specific datasets, notebooks, manuscripts, or review threads and least-privilege permissions.
- HIGH DENIAL_RATIONALE_TOO_THIN: AR-2002 has an insufficient denial rationale.
  - Evidence: The user-facing decision needs enough context to be fair, appealable, and auditable.
  - Remediation: Document the missing requirement, affected object scope, and remediation path.
- HIGH DENIAL_REASON_CODE_MISSING: AR-2002 has no denial reason code.
  - Evidence: Researchers need a concrete denial basis before they can appeal or remediate access gaps.
  - Remediation: Add a stable denial reason code such as TRAINING_EXPIRED, DUA_MISSING, IRB_SCOPE_MISMATCH, or OBJECT_SCOPE_TOO_BROAD.
- HIGH REQUIRED_APPEAL_EVIDENCE_MISSING: AR-2002 is missing required evidence duaActive for restricted_human access.
  - Evidence: Appeal outcomes must prove the requester satisfied the project data-access prerequisites.
  - Remediation: Attach valid duaActive evidence or keep access denied with a remediation checklist.
- HIGH REQUIRED_APPEAL_EVIDENCE_MISSING: AR-2002 is missing required evidence irbApproval for restricted_human access.
  - Evidence: Appeal outcomes must prove the requester satisfied the project data-access prerequisites.
  - Remediation: Attach valid irbApproval evidence or keep access denied with a remediation checklist.
- HIGH USER_FACING_RECEIPT_MISSING: AR-2002 has no requester-facing denial/appeal receipt.
  - Evidence: Researchers need a stable notice showing the decision, appeal path, and remediation checklist.
  - Remediation: Generate a requester-safe audit receipt with reason code, appeal deadline, outcome, and evidence checklist.
- WARNING APPEAL_OUTCOME_NOT_IN_RECEIPT: AR-2002 appeal outcome is not included in the user receipt.
  - Evidence: The requester-facing receipt should close the loop after an appeal is reviewed.
  - Remediation: Include appealOutcome and reviewerRole in the final appeal receipt.
- WARNING AUDIT_RECEIPT_FIELDS_MISSING: AR-2002 audit receipt is missing fields: reasonCode, appealDeadline, evidenceChecklist.
  - Evidence: Complete receipts reduce support churn and make the appeal process auditable.
  - Remediation: Add the missing receipt fields before finalizing the denial or appeal decision.
