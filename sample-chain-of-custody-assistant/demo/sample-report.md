# Sample Chain-of-Custody Review: SCI-CHAIN-001

Title: Cytokine drift after cold-chain interruption
Decision: HOLD

## Severity Counts

- Critical: 4
- High: 6
- Medium: 4
- Low: 0

## Findings

### [CRITICAL] conclusion-release-gate

- Sample/conclusion: S-1001,S-1002
- Evidence: Conclusion C-1 relies on sample(s) with critical custody findings.
- Remediation: Hold this conclusion until critical sample custody issues are resolved.

### [CRITICAL] assay-qc

- Sample/conclusion: S-1002
- Evidence: assay-run@2026-05-22T18:20:00Z has qcStatus=fail.
- Remediation: Do not release conclusions using this assay until QC failure is resolved or rerun.

### [CRITICAL] consent-link

- Sample/conclusion: S-1002
- Evidence: No consentId is attached to the sample metadata.
- Remediation: Attach a verified consent record or remove this sample from AI-supported conclusions.

### [CRITICAL] open-quarantine

- Sample/conclusion: S-1002
- Evidence: Open quarantine: temperature excursion pending QA disposition.
- Remediation: Resolve QA quarantine or remove this sample from conclusions.

### [HIGH] blinding-leak

- Sample/conclusion: S-1001
- Evidence: Reviewer-visible fields include group/arm metadata while blindingGroup=exposed.
- Remediation: Mask treatment-arm fields before AI review or document that the review is intentionally unblinded.

### [HIGH] blinding-leak

- Sample/conclusion: S-1002
- Evidence: Reviewer-visible fields include group/arm metadata while blindingGroup=exposed.
- Remediation: Mask treatment-arm fields before AI review or document that the review is intentionally unblinded.

### [HIGH] reviewer-signoff

- Sample/conclusion: S-1002
- Evidence: No reviewerSignoff record is present.
- Remediation: Obtain accountable QA/reviewer signoff before release.

### [HIGH] temperature-excursion

- Sample/conclusion: S-1002
- Evidence: storage@2026-05-22T16:45:00Z recorded 11.7C outside 2C-8C.
- Remediation: Open a QA disposition, document stability impact, and quarantine the sample until resolved.

### [HIGH] conclusion-release-gate

- Sample/conclusion: S-1003
- Evidence: Conclusion C-2 relies on sample(s) with high-risk custody findings.
- Remediation: Revise confidence language and require reviewer acceptance before release.

### [HIGH] required-custody-event

- Sample/conclusion: S-1003
- Evidence: Missing required custody event: assay-run.
- Remediation: Add a signed assay-run custody event or exclude this sample from release.

### [MEDIUM] custody-time-gap

- Sample/conclusion: S-1002
- Evidence: collect to accession gap is 7.8 hours.
- Remediation: Add intermediate courier/storage handoff evidence or downgrade conclusions that rely on this sample.

### [MEDIUM] handoff-signature

- Sample/conclusion: S-1002
- Evidence: accession@2026-05-22T16:30:00Z is missing actor or signature evidence.
- Remediation: Add a signed handoff record with accountable actor and timestamp.

### [MEDIUM] required-custody-event

- Sample/conclusion: S-1002
- Evidence: Missing required custody event: archive.
- Remediation: Add a signed archive custody event or exclude this sample from release.

### [MEDIUM] custody-time-gap

- Sample/conclusion: S-1003
- Evidence: storage to archive gap is 6.5 hours.
- Remediation: Add intermediate courier/storage handoff evidence or downgrade conclusions that rely on this sample.

## Research Gap Prompts

- Which biomarkers remain stable after the observed cold-chain excursion window?
- Would blinded AI review change the severity or interpretation of the reported effect?
- What courier or intermediate storage metadata should be captured to close shipment evidence gaps?
- Can the failed assay be rerun from archived aliquots, or should the conclusion be limited to unaffected samples?

