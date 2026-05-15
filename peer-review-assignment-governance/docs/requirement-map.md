# Requirement Map

This module targets SCIBASE issue #15, Community & User Reputation System.

## Peer Reviews and Comments

- Models public, anonymous, and double-blind review safety through `project.reviewMode`.
- Blocks reviewers with self, institution, recent collaboration, coauthor, or financial conflicts.
- Produces a chair checklist so review coordinators can act on blind-review and coverage risks before invitations are sent.

## Contributor Credits

- Uses reviewer profile history, completed reviews, turnaround, reproducibility score, endorsements, dispute rate, and overdue reviews as transparent contribution signals.
- Keeps reviewer identity masked in the selected slate with stable blind labels while preserving auditability for the chair.

## Reputation Scoring

- Computes deterministic score components for expertise, trust, workload, and conflict penalties.
- Separates eligible, conditional, and blocked reviewers so reputation signals do not hide hard conflicts.
- Includes alternates and missing coverage so assignment decisions can be reviewed without private credentials or live user data.

## Abuse and Quality Guardrails

- Hard-blocks high-severity COI signals before ranking.
- Downgrades shared-funder, workload, dispute, and calibration-drift risks to conditional review instead of silently selecting them.
- Emits a SHA-256 audit digest over the assignment packet to make future reviewer slates comparable.

## Local Verification

```bash
cd peer-review-assignment-governance
npm run check
npm test
npm run demo
```
