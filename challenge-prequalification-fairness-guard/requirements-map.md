# Requirements Map

## Challenge Posting Portal

- Verifies that prequalification rounds use strict UTC generated-at timestamps, complete published criteria lists, complete and unique criterion identifiers after trimming, nonnegative weights, valid weight totals, valid 0-100 pass thresholds, valid positive reviewer quorum requirements, explicit sponsor accept/reject decisions, complete applicant lists, complete unique applicant identities after trimming, and strict UTC appeal-window timestamps for rejected applicants.
- Blocks unpublished sponsor preferences from entering solver-screening decisions.
- Keeps prequalification decisions tied to challenge timelines and calendar-valid appeal windows.

## Submission Engine

- Protects anonymous or named participation settings during prequalification review.
- Requires a valid positive reviewer quorum before a solver team is accepted or rejected, and excludes missing or blank reviewer identities from quorum until reviewer evidence is completed.
- Holds missing, blank, duplicate, or malformed applicant identity entries before malformed applicant rows can change solver-team access.
- Holds missing round-level criteria lists and review lists before sparse prequalification packets can crash or change solver-team access.
- Holds malformed review entries before sparse reviewer evidence can crash or change solver-team access.
- Holds missing applicant lists before sparse prequalification packets can crash or change solver-team access.
- Holds malformed top-level prequalification packets before sparse challenge payloads can crash or change solver-team access.
- Holds premature award, winner, finalist, or public-result publication metadata before prequalification packets can change solver-team access.
- Holds incomplete reviewer score packets and invalid finite 0-100 score values for evidence completion instead of letting malformed review records crash or drive decisions.
- Preserves audit evidence for each applicant before access to private challenge workspaces changes.

## Arbitration And Reward Distribution

- Holds inconsistent threshold decisions for fairness review before a solver is excluded.
- Holds invalid pass thresholds for fairness review before sponsor accept/reject decisions can take effect.
- Holds invalid reviewer quorum requirements for fairness review before sponsor accept/reject decisions can take effect.
- Holds invalid sponsor decision values for fairness review before malformed accept/reject evidence can change solver access.
- Holds missing, duplicate, or malformed applicant identity evidence for fairness review before anonymous or malformed applicant rows can change solver access.
- Holds missing applicant-list evidence for fairness review before malformed challenge rounds can change solver access.
- Holds malformed top-level prequalification-round evidence for fairness review before sparse challenge payloads can change solver access.
- Holds invalid reviewer score values for fairness review before malformed score evidence can drive sponsor decisions.
- Holds duplicate published criterion identifiers for fairness review before ambiguous rubric evidence can drive sponsor decisions.
- Holds whitespace-variant duplicate published criterion identifiers for fairness review before ambiguous rubric evidence can drive sponsor decisions.
- Holds missing or blank published criterion identifiers for fairness review before unauditable rubric evidence can drive sponsor decisions.
- Flags reviewer conflicts, missing, omitted, or blank rejection reason evidence, and invalid or calendar-impossible appeal-window evidence for arbitration-ready remediation.
- Excludes conflicted reviewer scores from weighted threshold evidence while retaining the conflict finding.
- Deduplicates repeated reviewer identities before quorum and weighted threshold scoring while retaining the duplicate-evidence finding.
- Holds missing reviewer identity evidence before anonymous or malformed reviewer rows can satisfy quorum.
- Holds missing review-list evidence for fairness review before applicant decisions can take effect.
- Holds malformed review-entry evidence for fairness review before applicant decisions can take effect.
- Holds missing criteria-list evidence for fairness review before applicant decisions can take effect.
- Separates prequalification evidence from post-award publication evidence before access decisions can take effect.
- Produces deterministic digests for challenge administrators and third-party reviewers.

## Safety And Scope

- Synthetic data only.
- No credentials, payment processors, identity providers, sponsor systems, private workspaces, or external APIs.
- This slice is distinct from intake compliance, workspace privacy, clarification freeze, arbitration scoring, payout eligibility, award publication readiness, benchmark leakage, sponsor data-room access, and reviewer workload SLA guards.
