# Requirements Map

Issue: SCIBASE.AI #18, Scientific Bounty System

## Challenge Posting Portal

- Supports human-subject challenge readiness by checking participant groups, public/private visibility, regulations, and evaluation windows.
- Flags when public challenges attempt to expose controlled human-subject artifacts.
- Provides reviewer-safe readiness status before solvers or sponsors spend time on unsafe data flows.

## Submission Engine

- Evaluates submission artifacts for checksums, privacy level, direct identifiers, and re-identification risk.
- Produces a standardized reviewer packet for the challenge submission workspace.
- Uses deterministic synthetic sample data and local execution only.

## Arbitration And Reward Distribution

- Blocks payout and IP transfer when compliance approval is missing or unsafe.
- Produces remediation actions and audit digests that an arbitrator can cite.
- Separates `hold`, `review`, and `ready` states so partial compliance can be routed without hiding risk.

## Trust And Safety Fit

- Avoids overlap with existing #18 slices for challenge intake, rubric readiness, payout eligibility, data-room access, license/dependency risk, award transparency, evidence freeze, and cancellation/no-award accountability.
- Focuses specifically on human-subject, IRB, consent, DUA, HIPAA/GDPR, reviewer training, and compliance-gated payout/IP handoff.
