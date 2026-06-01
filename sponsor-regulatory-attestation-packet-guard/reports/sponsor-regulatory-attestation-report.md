# Sponsor Regulatory Attestation Packet Review

Generated: 2026-06-01T00:00:00.000Z
Decision: block_challenge_publication
Audit digest: c5968d2c0869aab4504f3f1db83698e87cbe9bfba735a8fba7027c343c72d94b

## Summary

- Challenges reviewed: 4
- Ready: 1
- Hold for compliance: 1
- Blocked: 2
- Critical findings: 10
- Warnings: 8

## Challenge Status

| Challenge | Sponsor | Amount USD | Status | Critical | Warnings |
| --- | --- | ---: | --- | ---: | ---: |
| Open Neuro Imaging Benchmark Prize | Atlas Neuro Collective Foundation | 500 | ready_to_open | 0 | 0 |
| Cross-border Catalyst Literature Review | Materials Insight Lab LLC | 900 | hold_for_compliance | 0 | 7 |
| Clinical Proteomics Translational Prize | Proteomics Venture Studio Inc. | 2500 | block_challenge | 7 | 0 |
| Dual-use Sensor Fusion Model Challenge | Frontier Robotics Initiative | 1200 | block_challenge | 3 | 1 |

## Findings

### WARNING: stale_source_of_funds_attestation

Challenge: Cross-border Catalyst Literature Review

The source-of-funds attestation is older than the freshness window.

Remediation: Refresh sponsor funding attestations before the challenge is opened or extended.

### WARNING: sanctions_screening_requires_review

Challenge: Cross-border Catalyst Literature Review

The sponsor screening result requires compliance review.

Remediation: Hold publication until the screening review is resolved.

### WARNING: stale_sanctions_screening

Challenge: Cross-border Catalyst Literature Review

The sanctions screening result is older than the allowed freshness window.

Remediation: Refresh the screening packet before accepting submissions or paying prize funds.

### WARNING: unknown_export_control_classification

Challenge: Cross-border Catalyst Literature Review

The challenge has no export-control classification.

Remediation: Classify the challenge as exempt, EAR99, restricted, or not applicable before publication.

### WARNING: missing_international_participation_controls

Challenge: Cross-border Catalyst Literature Review

International participation is expected but no participant-control digest is attached.

Remediation: Record eligibility controls for international participants before the challenge opens.

### WARNING: missing_cancellation_or_refund_policy

Challenge: Cross-border Catalyst Literature Review

The public terms do not identify cancellation and refund handling.

Remediation: Publish cancellation and refund language so sponsors and solvers share the same expectations.

### WARNING: missing_compliance_contact

Challenge: Cross-border Catalyst Literature Review

The challenge lacks a sponsor compliance escalation contact.

Remediation: Add a compliance contact for screening, tax, export-control, or sponsor-attestation questions.

### CRITICAL: missing_source_of_funds_attestation

Challenge: Clinical Proteomics Translational Prize

The sponsor has not supplied a verifiable source-of-funds attestation.

Remediation: Require a signed source-of-funds statement digest before accepting submissions.

### CRITICAL: blocked_sanctions_screening

Challenge: Clinical Proteomics Translational Prize

The sponsor packet contains an unresolved blocked sanctions screening result.

Remediation: Block the challenge until compliance counsel clears or rejects the sponsor.

### CRITICAL: unresolved_beneficial_owner_screening_hit

Challenge: Clinical Proteomics Translational Prize

A beneficial owner has a screening hit without a resolution record.

Remediation: Attach a compliance resolution digest or block the challenge.

### CRITICAL: missing_high_value_tax_reporting_plan

Challenge: Clinical Proteomics Translational Prize

A high-value prize lacks a tax reporting plan digest.

Remediation: Attach the sponsor-side tax reporting plan before submissions are opened.

### CRITICAL: incomplete_tax_form_status

Challenge: Clinical Proteomics Translational Prize

The sponsor packet does not mark tax form readiness as complete or not applicable.

Remediation: Resolve sponsor-side tax form readiness before prize commitments are advertised.

### CRITICAL: missing_cross_border_withholding_review

Challenge: Clinical Proteomics Translational Prize

Expected payout jurisdictions differ from the sponsor jurisdiction but withholding review is incomplete.

Remediation: Complete cross-border withholding review before challenge launch.

### CRITICAL: missing_regulated_domain_review_packet

Challenge: Clinical Proteomics Translational Prize

The challenge is marked as regulated but lacks a regulatory review packet digest.

Remediation: Attach the domain-specific regulatory review packet before publishing the challenge.

### CRITICAL: missing_third_party_funding_disclosure

Challenge: Dual-use Sensor Fusion Model Challenge

Third-party prize funding is marked but no sponsor disclosure digest is attached.

Remediation: Attach a disclosure digest naming the upstream funder and any restrictions on the prize.

### CRITICAL: restricted_export_without_counsel_approval

Challenge: Dual-use Sensor Fusion Model Challenge

A restricted export-control classification lacks counsel approval evidence.

Remediation: Attach counsel approval and participant restrictions before publishing the challenge.

### WARNING: missing_international_participation_controls

Challenge: Dual-use Sensor Fusion Model Challenge

International participation is expected but no participant-control digest is attached.

Remediation: Record eligibility controls for international participants before the challenge opens.

### CRITICAL: missing_public_rules_digest

Challenge: Dual-use Sensor Fusion Model Challenge

The challenge does not have immutable public rules evidence.

Remediation: Attach a SHA-256 digest of the public rules, deliverables, and evaluation disclosures.
