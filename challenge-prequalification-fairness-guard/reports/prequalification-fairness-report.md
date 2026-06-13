# Challenge Prequalification Fairness Guard

Challenge: challenge-18-prequalification-rna-biomarker
Generated: 2026-05-28T08:00:00Z

## Summary

- Accepted applicants: 1
- Held for fairness review: 3
- Rejected with audit trail: 0
- Remediation actions: 3
- Criteria digest: sha256:d643b033793917b9d0488787518a11e97094e671d52b86b69a6153375d726721
- Audit digest: sha256:5ec541696fa83ff5f5ac49891dbb4bdf0e1174638039f2a2e7b6e65f2df49d16

## Decisions

- applicant-biofoundry: accept-prequalified, score 87, reasons: none
- applicant-neuro-lab: hold-for-fairness-review, score 81, reasons: anonymous-screening-leak, inconsistent-threshold-decision
- applicant-sponsor-alumni: hold-for-fairness-review, score 70, reasons: missing-appeal-window, missing-rejection-reason, reviewer-conflict, reviewer-quorum-shortfall
- applicant-missing-reviewer-identity: hold-for-fairness-review, score 0, reasons: inconsistent-threshold-decision, missing-reviewer-identity, reviewer-quorum-shortfall

## Remediation Actions

- remediate-applicant-neuro-lab: rerun-blinded-prequalification-review (high)
- remediate-applicant-sponsor-alumni: replace-conflicted-reviewer (high)
- remediate-applicant-missing-reviewer-identity: complete-prequalification-evidence (high)

## Missing Criterion Identifier Packet

- Applicant: applicant-missing-criterion-id
- Decision: hold-for-fairness-review
- Reasons: missing-published-criterion-id
- Remediation: publish-complete-screening-criteria
- Audit digest: sha256:b9df8bf4b4cf0ab259501a17673e27b1537153778f87a19190f026759151b27e

## Normalized Criterion Identifier Packet

- Applicant: applicant-normalized-criterion-id
- Decision: hold-for-fairness-review
- Reasons: duplicate-published-criterion
- Remediation: publish-unique-screening-criteria
- Audit digest: sha256:fdfd47231c8acfdad73947f357080e3e6967bd11dd622ee60d0ebebb40688ee6

## Invalid Reviewer Score Packet

- Applicant: applicant-invalid-reviewer-score
- Decision: hold-for-fairness-review
- Reasons: reviewer-score-value-invalid
- Remediation: publish-valid-reviewer-score-evidence
- Audit digest: sha256:806cf8166a6f1d58824929c4964ec009b6d6a8ce4d613b9e357a1e0e684fda69

## Invalid Reviewer Quorum Packet

- Applicant: applicant-invalid-reviewer-quorum
- Decision: hold-for-fairness-review
- Reasons: reviewer-quorum-invalid
- Remediation: publish-valid-reviewer-quorum
- Audit digest: sha256:61801b0cd7cf7c62fc38b0f6e62415e770d388bf3844e2132b8a379183e74ca1

## Invalid Sponsor Decision Packet

- Applicant: applicant-invalid-sponsor-decision
- Decision: hold-for-fairness-review
- Reasons: sponsor-decision-invalid
- Remediation: publish-valid-sponsor-decision
- Audit digest: sha256:030c1d99cb355c21fb3d67e9876997fd4a8bb2042a76d205fe3c3b79beaeccc3

## Missing Applicant Identity Packet

- Applicant: "unidentified-applicant"
- Decision: hold-for-fairness-review
- Reasons: missing-applicant-identity
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:85aa774922f5707139444c13c705a88af31757014d98a8767b0cbe1725c4cf7c

## Duplicate Applicant Identity Packet

- Applicant: applicant-duplicate
- Decision: hold-for-fairness-review
- Reasons: duplicate-applicant-identity
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:3f23ed40ab5aa7c06e33ca3dc3b149bae1d550f3764425c6955cedf04beb01e0

## Missing Review List Packet

- Applicant: applicant-missing-review-list
- Decision: hold-for-fairness-review
- Reasons: inconsistent-threshold-decision, missing-review-list, reviewer-quorum-shortfall
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:205a2e89821f1f3e7c9b83e959f0b123967d8af29b659d89af898e473ed4033d

## Malformed Review Entry Packet

- Applicant: applicant-malformed-review-entry
- Decision: hold-for-fairness-review
- Reviewers counted: 2
- Reasons: malformed-review-entry
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:92f8e6dbb21bc4f859670a8add42b7e265487aec1eead2c48a87adc717d95976

## Missing Criteria List Packet

- Applicant: applicant-missing-criteria-list
- Decision: hold-for-fairness-review
- Reasons: criteria-weight-total-invalid, inconsistent-threshold-decision, missing-published-criteria-list, unpublished-screening-criterion
- Remediation: publish-complete-screening-criteria
- Audit digest: sha256:c2d8b60e1ca8cc50e8b8c072ee2a22a9a832df09b59e63d60dd21b41b1f17fd3

## Malformed Criterion Entry Packet

- Applicant: applicant-malformed-criterion-entry
- Decision: hold-for-fairness-review
- Reasons: criteria-weight-total-invalid, criteria-weight-value-invalid, inconsistent-threshold-decision, malformed-published-criterion-entry, missing-published-criterion-id, reviewer-quorum-shortfall
- Remediation: publish-complete-screening-criteria
- Audit digest: sha256:288e8b93e7b316689b59f0d21d90d99e579ad0231804b4d64291f20e66d7ec4a

## Missing Applicant List Packet

- Applicant: unidentified-applicant
- Decision: hold-for-fairness-review
- Reasons: missing-applicant-list
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:c77ccb7f1875504454711c406569be8b6b9b34789239e956635850890ecf1a90

## Malformed Prequalification Round Packet

- Challenge: unidentified-challenge
- Applicant: unidentified-applicant
- Decision: hold-for-fairness-review
- Reasons: malformed-prequalification-round, missing-applicant-list, missing-challenge-identity, missing-published-criteria-list, missing-review-list
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:83b5c9c1376cc3afd1111fb7c9ba79b3fcbd41be82907d10d40590a40d9d9f9e

## Missing Challenge Identity Packet

- Challenge: unidentified-challenge
- Applicant: applicant-missing-challenge-identity
- Decision: hold-for-fairness-review
- Reasons: missing-challenge-identity
- Remediation: complete-challenge-identity-evidence
- Audit digest: sha256:dcd93740470a0b4a16d6e7913c2f62a81fc895d7cbf664b4317b239bddd1ae6d

## Invalid Generated At Packet

- Generated: "not-a-date"
- Applicant: applicant-invalid-generated-at
- Decision: hold-for-fairness-review
- Reasons: generated-at-invalid
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:38cad55f45671cce8012765784d45b26647492bc4668b416088522d9b4baec31

## Impossible Generated At Packet

- Generated: "2026-02-30T08:00:00Z"
- Applicant: applicant-impossible-generated-at
- Decision: hold-for-fairness-review
- Reasons: generated-at-invalid
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:db2ef3d0e48beabe7b8481dc62e45e20bf84d4adaf6c28280a9fe963e0ea0c9b

## Malformed Applicant Entry Packet

- Applicant: unidentified-applicant
- Decision: hold-for-fairness-review
- Reasons: malformed-applicant-entry
- Remediation: complete-prequalification-evidence
- Audit digest: sha256:f186f54dec87f06c4cc6c61d8de82dfc74749a0ce103446d2084e1fb0f3b6de4

## Blank Rejection Reason Packet

- Applicant: applicant-blank-rejection-reason
- Decision: hold-for-fairness-review
- Reasons: missing-rejection-reason
- Remediation: publish-rejection-reasons-and-appeal-window
- Audit digest: sha256:bbd51d47794aadc8faa0eda8231781f66d0e4eacde31bd0362b6e723834a444c

## Impossible Appeal Window Packet

- Applicant: applicant-impossible-appeal
- Decision: hold-for-fairness-review
- Appeal status: invalid
- Reasons: invalid-appeal-window
- Remediation: publish-rejection-reasons-and-appeal-window
- Audit digest: sha256:6ef2884f4bd43b760c3c674bfaf0d3e0283d9cc0de73fdba0fc1630bc9c393b8

## Safety

All fixtures are synthetic. The guard does not call payment processors, identity providers, private workspaces, sponsor systems, or external APIs.
