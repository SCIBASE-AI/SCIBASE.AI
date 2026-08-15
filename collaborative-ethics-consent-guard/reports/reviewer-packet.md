# Collaborative Ethics and Consent Export Review

Generated: 2026-08-15T21:08:58.890Z

## Decision Counts

- RELEASE: 1
- REVIEW: 1
- HOLD: 2

## Packet Reviews

### Clean collaborative consent export
Decision: RELEASE
Confidence: 0.96
Human subjects: true
Comments checked: 1
Reviewer note: public health: ethics, consent, comments, and export scope are publication-ready.

### Vulnerable population review needs refresh
Decision: REVIEW
Confidence: 0.31
Human subjects: true
Comments checked: 1
Reviewer note: education research: REVIEW before export because the manuscript includes vulnerable participant groups without documented enhanced ethics review.
- MAJOR VULNERABLE_POPULATION_REVIEW_MISSING: The manuscript includes vulnerable participant groups without documented enhanced ethics review.
  Remediation: Add vulnerable-population review evidence and consent safeguards before publication export.
- MAJOR TRANSLATED_CONSENT_COVERAGE_MISSING: Required consent-language coverage is missing for one or more participant groups.
  Remediation: Add translated consent evidence or justify why those participant groups are not included in the export.
- MAJOR STALE_ETHICS_REVIEW: The last ethics-section review is older than the configured freshness window.
  Remediation: Refresh ethics reviewer signoff after the latest collaborative edits.
- MINOR UNRESOLVED_ETHICS_COMMENT: An ethics-section comment remains unresolved at export time.
  Remediation: Resolve or explicitly defer the ethics comment before publication export.

### Human-subjects packet without approval
Decision: HOLD
Confidence: 0.11
Human subjects: true
Comments checked: 0
Reviewer note: clinical methods: HOLD before export because the manuscript involves human subjects but lacks an ethics approval identifier.
- CRITICAL MISSING_ETHICS_APPROVAL_ID: The manuscript involves human subjects but lacks an ethics approval identifier.
  Remediation: Add the IRB/REC approval identifier or mark the study as exempt with supporting rationale.
- CRITICAL MISSING_CONSENT_STATEMENT: Consent is required but no consent statement is present in the collaborative manuscript.
  Remediation: Add a consent statement or documented waiver before export.
- MAJOR TRANSLATED_CONSENT_COVERAGE_MISSING: Required consent-language coverage is missing for one or more participant groups.
  Remediation: Add translated consent evidence or justify why those participant groups are not included in the export.

### Private participant details leaking through comments
Decision: HOLD
Confidence: 0.1
Human subjects: true
Comments checked: 1
Reviewer note: behavioral science: HOLD before export because a locked ethics or consent section has pending collaborative edits without approved override.
- MAJOR LOCKED_ETHICS_SECTION_HAS_PENDING_EDITS: A locked ethics or consent section has pending collaborative edits without approved override.
  Remediation: Route pending edits through the section owner or ethics reviewer before export.
- CRITICAL PRIVATE_ETHICS_COMMENT_VISIBLE_IN_EXPORT: A private ethics or reviewer comment is marked visible in the export packet.
  Remediation: Redact or remove private comments before creating the public manuscript export.
- CRITICAL PARTICIPANT_IDENTIFIER_IN_COMMENT: A collaborative comment appears to contain a participant, subject, patient, MRN, or DOB marker.
  Remediation: Redact participant identifiers and regenerate reviewer-safe comments before export.
- MINOR UNRESOLVED_ETHICS_COMMENT: An ethics-section comment remains unresolved at export time.
  Remediation: Resolve or explicitly defer the ethics comment before publication export.

