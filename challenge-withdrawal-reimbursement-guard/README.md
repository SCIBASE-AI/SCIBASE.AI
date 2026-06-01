# Challenge Withdrawal Reimbursement Guard

This self-contained module adds a deterministic closeout guard for sponsor withdrawals, cancellations, and material scope reductions in the SCIBASE Scientific Bounty System. It is scoped to issue #18 and focuses on solver fairness after teams have already started work.

The guard does not call external APIs, payment processors, live payout systems, private data stores, or credentialed services. Fixtures are synthetic and every check runs with Node built-ins.

## What It Checks

- Sponsor cancellation authority and reviewer-ready withdrawal reasons.
- Equal direct notice to every started solver.
- Appeal-window and solver-cost claim instructions in each notice.
- Dispute-hold duration before sponsor refund or challenge closeout.
- Milestone-progress evidence and hashed work artifacts.
- Cost claim evidence for documented solver spend.
- Receipt hashes for non-refundable solver costs.
- Sponsor-funded reimbursement reserve sufficiency.
- Recorded reimbursement decisions against deterministic recommendations.
- IP return and data-destruction attestations before closeout.

## Local Validation

```sh
npm --prefix challenge-withdrawal-reimbursement-guard run check
npm --prefix challenge-withdrawal-reimbursement-guard test
npm --prefix challenge-withdrawal-reimbursement-guard run demo
npm --prefix challenge-withdrawal-reimbursement-guard run make-demo-video
npm --prefix challenge-withdrawal-reimbursement-guard run verify-video
```

## Generated Artifacts

Running the demo writes:

- `reports/clean-withdrawal-report.json`
- `reports/risky-withdrawal-report.json`
- `reports/risky-withdrawal-handoff.md`
- `reports/withdrawal-dashboard.svg`
- `reports/demo.mp4`

The risky packet intentionally demonstrates release blockers: missing cancellation authority, thin withdrawal reason, unequal solver notice, missing appeal and cost-claim instructions, missing milestone evidence, missing cost evidence, missing non-refundable receipts, incomplete IP/data return attestations, short dispute hold, missing appeal deadline, reimbursement shortfalls, and an underfunded reimbursement reserve.

## Issue Fit

This is a distinct Scientific Bounty System slice. It complements the existing intake, rubric readiness, scoring, arbitration, award transparency, appeals, escrow, payout eligibility, sponsor compliance, debrief feedback, onboarding clock parity, communication parity, accessibility/localization, deadline fairness, and amendment-consent work by focusing specifically on cancellation closeout fairness after solvers have already incurred work and costs.
