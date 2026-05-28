# Clinical Adverse-Event Safety Review

Decision: hold
Findings: 7
Digest: sha256:629cb1eb83373c402aa3e743d6385e1e003eb0fc6a7b1cf043577f8cb22a6fe1

## Findings
- CRITICAL serious-ae-underreported: Treatment reports fewer serious adverse events than captured in source counts.
- HIGH missing-event-denominator: Treatment has adverse-event rows without participant denominators.
- HIGH arm-level-ae-imbalance: Grade 3+ adverse-event burden differs materially across study arms.
- HIGH exposure-adjusted-incidence-gap: Exposure-adjusted serious adverse-event incidence is not discussed across arms.
- HIGH oversight-follow-up-missing: DSMB or IRB follow-up is not linked before safety language is marked ready.
- CRITICAL severity-grade-claim-mismatch: Safety claim understates the highest linked adverse-event severity grade.
- MEDIUM claim-downplays-safety-uncertainty: Manuscript wording downplays unresolved safety uncertainty.

## Required actions
- reconcile-serious-adverse-event-table
- add-participants-at-risk-denominators
- explain-arm-level-ae-imbalance
- add-exposure-adjusted-safety-analysis
- link-dsmb-or-irb-follow-up-before-ready
- revise-safety-claim-to-match-severity-grades
- qualify-safety-language-before-release
