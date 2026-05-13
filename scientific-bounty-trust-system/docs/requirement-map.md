# Requirement Map

| Issue #18 requirement | Implementation evidence |
| --- | --- |
| Challenge Posting Portal | `buildChallengeContract` validates challenge fields, deliverables, timeline, prize schedule, privacy, and qualification mode. |
| Required problem context and deliverables | `sampleChallenge` plus `buildChallengeContract.requiredFields` and `deliverableChecklist`. |
| Evaluation criteria and scoring rubric | `buildRubric` normalizes weighted criteria and exposes max score. |
| Timeline and milestone deadlines | `buildChallengeContract.timeline` and `deriveMilestonePayouts`. |
| Prize amount and payout schedule | `deriveMilestonePayouts` and `routePayouts`. |
| Public/private challenges and NDA support | `visibility`, `ndaRequired`, and `accessPolicy`. |
| Submission Engine | `buildSubmissionPackage` creates manifest, artifact hashes, audit log, eligibility status, and disclosure gate. |
| Secure private project space | `workspacePolicy` and package disclosure levels model restricted sponsor access. |
| Automated deliverable manifest | `buildSubmissionPackage.manifest` and `artifactIndex`. |
| Anonymous or named participation | `participantMode` is preserved in package metadata. |
| Multi-phase challenge support | `phases` and milestone payout derivation. |
| Arbitration and reward distribution | `buildArbitrationCase` and `routePayouts`. |
| Automated checklist for deliverables | `buildArbitrationCase.checklist`. |
| Third-party reviewers or peer validators | `reviewerVotes` are captured with weighted scores. |
| Feedback loop | `sponsorFeedback` and decision rationale. |
| Escrowed prize funds and partial payments | `routePayouts` requires funded escrow and creates winner/milestone/honorable payouts. |
| Payout routing to people, teams, institutions | `recipientType` supports individual, team, and institution. |
| IP management options | `resolveIpTerms` supports solver-retains, transfer-upon-payout, and open submissions. |
