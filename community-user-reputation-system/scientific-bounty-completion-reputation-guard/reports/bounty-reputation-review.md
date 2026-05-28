# Scientific Bounty Reputation Review: SYN-BOUNTY-REP-015

Status: **block-reputation-release**
Risk score: **100/100**
Release readiness: **0/100**

Keep reputation deltas pending until funded settlement, appeal closure, milestone parity, and evidence-backed team attribution are present.

| Severity | Check | Finding | Action |
| --- | --- | --- | --- |
| critical | unfunded-settlement | Sponsor acceptance is not enough for reputation credit | Hold badges, leaderboard points, and citation visibility until funded settlement evidence is attached. |
| high | appeal-window-open | Appeal or hold window is still active | Queue the reputation update as pending until appeal and hold windows close without unresolved disputes. |
| high | milestone-scope-gap | Accepted scope does not cover all declared milestones | Award only milestone-scoped credit or request explicit sponsor acceptance for the remaining deliverables. |
| high | team-attribution-mismatch | Team credit split is not supported by evidence | Require signed split agreement or allocate provisional credit using evidence-backed contribution shares. |
| medium | duplicate-claim-risk | Requested reputation update overlaps prior claims | Deduplicate badge and point events before reputation ledgers or citation pages are updated. |
| medium | post-submission-scope-change | Scope changed after solver submission | Normalize reputation credit to the scope active at submission time or attach sponsor-approved change evidence. |
| medium | external-review-pending | Independent review is not complete | Hold expert-tier badges until the external reviewer decision is final. |
| medium | dispute-or-unfrozen-scores | Disputes or mutable scorecards can distort reputation | Block leaderboard promotion until disputes close and the scorecard hash is frozen. |
| low | difficulty-tier-mismatch | Requested leaderboard tier is stronger than challenge difficulty | Apply difficulty-normalized points and reserve top-tier badges for expert-level challenges. |
