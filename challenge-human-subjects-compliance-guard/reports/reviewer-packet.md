# Human Subjects Compliance Guard

Issue: SCIBASE.AI #18 Scientific Bounty System
Scope: compliance gate before sponsor review, award payout, or IP transfer for submissions using human-subject data.

## Submission Decisions

### SUB-TEAM-17
Challenge: CH-HUMAN-042
Status: HOLD
Required decision: hold_submission
Audit digest: `CH-HUMAN-042:SUB-TEAM-17:hold:B=CONSENT_GROUP_GAP|CONSENT_USE_MISMATCH|DATA_USE_AGREEMENT_MISSING|DIRECT_IDENTIFIERS_PRESENT|ETHICS_APPROVAL_NOT_ACTIVE|GDPR_LAWFUL_BASIS_MISSING|GDPR_TRANSFER_MECHANISM_MISSING|HIGH_REIDENTIFICATION_RISK|HIPAA_MINIMUM_NECESSARY_MISSING|IP_RELEASE_BEFORE_COMPLIANCE|MISSING_ARTIFACT_CHECKSUM|PAYOUT_BEFORE_COMPLIANCE|RAW_DATA_ACCESS_OUTSIDE_PRIVATE_CHALLENGE|REVIEWER_CONFLICT_DECLARATION_MISSING|REVIEWER_TRAINING_MISSING|UNSUPPORTED_PRIVACY_LEVEL:W=MISSING_PRIVACY_CONTACT|MISSING_PROTOCOL_ID|REVIEWER_ACCESS_EXPIRES_BEFORE_EVALUATION_END|SPONSOR_HOLD_ACK_MISSING|WITHDRAWAL_WINDOW_OPEN`

Blockers:
- ETHICS_APPROVAL_NOT_ACTIVE: Ethics approval status 'pending' is not acceptable for review.
- CONSENT_GROUP_GAP: Consent coverage is missing for: icu-patients.
- CONSENT_USE_MISMATCH: Consent terms do not explicitly allow prize challenge analysis and review.
- MISSING_ARTIFACT_CHECKSUM: Raw ICU encounter extract lacks a frozen checksum.
- DIRECT_IDENTIFIERS_PRESENT: Raw ICU encounter extract still contains direct identifiers.
- UNSUPPORTED_PRIVACY_LEVEL: Raw ICU encounter extract must be aggregate, deidentified, synthetic, or controlled.
- HIGH_REIDENTIFICATION_RISK: Raw ICU encounter extract has high re-identification risk.
- HIPAA_MINIMUM_NECESSARY_MISSING: HIPAA-scoped submission lacks minimum-necessary review evidence.
- GDPR_LAWFUL_BASIS_MISSING: GDPR-scoped submission lacks a lawful basis for challenge processing.
- GDPR_TRANSFER_MECHANISM_MISSING: Cross-border processing is enabled without a transfer mechanism.
- DATA_USE_AGREEMENT_MISSING: Human-subject data processing requires a data-use agreement or equivalent control.
- REVIEWER_TRAINING_MISSING: Clinical reviewer lacks current human-subjects training.
- REVIEWER_CONFLICT_DECLARATION_MISSING: Clinical reviewer has not signed a conflict declaration.
- RAW_DATA_ACCESS_OUTSIDE_PRIVATE_CHALLENGE: Clinical reviewer has raw-data access outside a private challenge.
- IP_RELEASE_BEFORE_COMPLIANCE: IP release is configured before human-subject compliance approval.
- PAYOUT_BEFORE_COMPLIANCE: Payout is configured before human-subject compliance approval.

Warnings:
- MISSING_PROTOCOL_ID: Ethics evidence is present but does not include a protocol identifier.
- WITHDRAWAL_WINDOW_OPEN: Participant withdrawal window is still open during challenge evaluation.
- MISSING_PRIVACY_CONTACT: No privacy escalation contact is recorded for regulated data.
- REVIEWER_ACCESS_EXPIRES_BEFORE_EVALUATION_END: Clinical reviewer access expires before the evaluation window ends.
- SPONSOR_HOLD_ACK_MISSING: Sponsor has not acknowledged that compliance blockers can hold review, payout, or IP transfer.

Remediation actions:
- Resolve pending or rejected ethics approval before exposing the submission.
- Record a protocol ID so the arbitration packet can be independently checked.
- Map consent or waiver evidence to every declared participant group.
- Confirm challenge participation is within consented research use.
- Delay final award review until the withdrawal window closes or freeze affected rows.
- Freeze Raw ICU encounter extract with a checksum before reviewer access.
- Remove direct identifiers from Raw ICU encounter extract or keep it outside the challenge workspace.
- Classify privacy level for Raw ICU encounter extract and restrict access accordingly.
- Reduce quasi-identifier detail or move Raw ICU encounter extract into controlled access.
- Attach minimum-necessary review before sponsor or reviewer access.
- Record lawful basis and data subject rights route before evaluation.
- Add SCC, adequacy, or other transfer mechanism evidence.
- Attach DUA or equivalent controlled-access agreement.
- Update human-subjects training for Clinical reviewer.
- Collect conflict declaration from Clinical reviewer.
- Limit raw-data access to private challenge reviewers only.
- Gate IP transfer until compliance hold is cleared and payout is approved.
- Hold payout until compliance approval is recorded.

### SUB-TEAM-33
Challenge: CH-HUMAN-044
Status: REVIEW
Required decision: compliance_review
Audit digest: `CH-HUMAN-044:SUB-TEAM-33:review:B=none:W=ETHICS_APPROVAL_EXPIRING_SOON|MEDIUM_REIDENTIFICATION_RISK`

Blockers:
- None.

Warnings:
- ETHICS_APPROVAL_EXPIRING_SOON: Ethics approval expires soon on 2026-06-10.
- MEDIUM_REIDENTIFICATION_RISK: Deidentified survey feature table needs reviewer confirmation for medium re-identification risk.

Remediation actions:
- Confirm the approval window covers the full evaluation and appeal period.

### SUB-TEAM-21
Challenge: CH-HUMAN-043
Status: READY
Required decision: release_for_scoring
Audit digest: `CH-HUMAN-043:SUB-TEAM-21:ready:B=none:W=none`

Blockers:
- None.

Warnings:
- None.

Remediation actions:

## Notes
This demo uses synthetic data only. It makes no external calls and does not process real patient or participant records.
