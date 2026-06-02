# Requirements Map

This contribution maps to SCIBASE issue #18, Scientific Bounty System.

## Arbitration & Reward Distribution

- Escrowed prize funds: verifies that challenge prize funds are present before submissions proceed.
- Partial payments for milestones: reconciles milestone payout schedules against the advertised prize.
- Payout routing: checks that each payout entry has a destination class and release trigger.
- Solver trust: blocks challenge launch when sponsor funding or release authorization is incomplete.

## Challenge Posting Portal

- Prize amount and payout schedule: validates exact schedule totals, currency, and deadlines.
- Timeline and milestone deadlines: checks escrow validity through the award decision window.

## Submission Engine

- Submission protection: produces hold/revise decisions before solvers spend time on an underfunded challenge.
- Audit logs for reproducibility: emits deterministic JSON and Markdown reviewer artifacts.

## Boundaries

This is not a live payment integration. It is a synthetic, dependency-free guard that demonstrates how SCIBASE can prevent unfunded scientific bounties from entering the active solver marketplace.
