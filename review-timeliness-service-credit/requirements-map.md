# Requirements Map

| Issue #15 requirement | Implementation |
| --- | --- |
| Structured peer reviews | `scoreSingleReview()` evaluates each structured review event. |
| Optional scoring on clarity, rigor, novelty, reproducibility | The slice scores actionable comments and evidence links as quality proxies for service reputation. |
| Review history on profiles | `scoreReviewer()` aggregates review events into a reviewer service tier. |
| Badges and reputation scores | `createServiceCreditPacket()` emits service-credit scores and leaderboard-ready reviewers. |
| Blind or double-blind modes | Privacy breaches create `blind-review-privacy-hold` before public reputation changes. |
| Trust and transparency | The transparency receipt lists included and excluded signals so users can audit reputation deltas. |
| Abuse resistance | Overdue reviews, low-actionable density, missing evidence links, and privacy breaches are routed to moderator actions. |

## Acceptance notes

- Dependency-free CommonJS module.
- Deterministic sample ledger and tests.
- No credentials, network calls, or external services.
- Generated reports are local artifacts under `reports/`.
