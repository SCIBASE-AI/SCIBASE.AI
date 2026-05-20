# Requirements Map

| Requirement | Implementation |
| --- | --- |
| Paid scientific challenge submissions need clear payout eligibility decisions | `evaluateChallenge()` returns `approved`, `needs_review`, or `blocked` with payout hold status |
| Maintainers need to detect holdout leakage before award release | Holdout access flags, holdout download flags, and leakage scores produce blocking findings |
| Reported scores must be auditable | Reported metrics are compared with recomputed scores using a configured tolerance |
| Benchmark artifacts must remain immutable | Challenge and submission package hashes are validated and compared |
| Repeated submissions can bias leaderboard outcomes | Submission history is checked against max submission and cooldown rules |
| Ties need deterministic review | Tie-breaker configuration is validated and leaderboard rows include tie-break readiness |
| Reviewers need a concise packet | `demo.js` emits JSON, Markdown, SVG, and MP4 demo artifacts |
| The module must run in a sparse repo | Node built-ins only; no package install required |
