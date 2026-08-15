# Review Retaliation Guard Report

Generated: 2026-08-15T21:37:04.968Z
Packets analyzed: 4
Decision counts: CLEAR 2, REVIEW 0, HOLD 2

## Findings

### rep-clear-001: Critical review with independent reputation hold

Decision: CLEAR
Risk score: 0
Critical review: yes
Suspicious events: 0

- No retaliation risk detected.

Recommended actions:
- Apply reputation changes with normal audit logging.

### rep-hold-002: Author-affiliated penalties after rejection recommendation

Decision: HOLD
Risk score: 100
Critical review: yes
Suspicious events: 2

- CRITICAL AFFILIATED_PUNITIVE_ACTION_AFTER_CRITICAL_REVIEW: An author-affiliated actor applied a punitive reputation action shortly after a critical review.
- CRITICAL AFFILIATED_PUNITIVE_ACTION_AFTER_CRITICAL_REVIEW: An author-affiliated actor applied a punitive reputation action shortly after a critical review.
- CRITICAL RECIPROCAL_OR_CLUSTERED_RETALIATION_BURST: Multiple affiliated actors targeted the same reviewer within the retaliation window.
- MAJOR PROFILE_CREDIT_REMOVED_AFTER_UNFAVORABLE_REVIEW: A public-facing badge, endorsement, role, or visibility signal was reduced after an unfavorable review.
- MAJOR INDEPENDENT_REVIEW_MISSING_FOR_RETALIATION_RISK: The packet has retaliation risk but no independent moderator review recorded.
- MAJOR APPEAL_WINDOW_TOO_SHORT_FOR_REPUTATION_DELTA: The reviewer has insufficient time to appeal a reputation-impacting action.
- CRITICAL PUBLIC_REPUTATION_EXPORT_NOT_FROZEN: Public reputation export is enabled while unresolved retaliation risk exists.

Recommended actions:
- Disable leaderboard and public profile export for the affected reviewer until resolution.
- Freeze reputation deltas tied to the flagged review.
- Generate an evidence packet for an independent moderator.
- Notify the affected reviewer of the appeal pathway.

### rep-hold-003: Coercive endorsement withdrawal tied to review revision

Decision: HOLD
Risk score: 100
Critical review: yes
Suspicious events: 1

- CRITICAL AFFILIATED_PUNITIVE_ACTION_AFTER_CRITICAL_REVIEW: An author-affiliated actor applied a punitive reputation action shortly after a critical review.
- CRITICAL COERCIVE_REVIEW_REVISION_SIGNAL: A reputation event contains language that appears to pressure the reviewer to soften or alter criticism.
- MAJOR PROFILE_CREDIT_REMOVED_AFTER_UNFAVORABLE_REVIEW: A public-facing badge, endorsement, role, or visibility signal was reduced after an unfavorable review.
- MAJOR INDEPENDENT_REVIEW_MISSING_FOR_RETALIATION_RISK: The packet has retaliation risk but no independent moderator review recorded.
- MAJOR APPEAL_WINDOW_TOO_SHORT_FOR_REPUTATION_DELTA: The reviewer has insufficient time to appeal a reputation-impacting action.
- CRITICAL PUBLIC_REPUTATION_EXPORT_NOT_FROZEN: Public reputation export is enabled while unresolved retaliation risk exists.

Recommended actions:
- Disable leaderboard and public profile export for the affected reviewer until resolution.
- Freeze reputation deltas tied to the flagged review.
- Generate an evidence packet for an independent moderator.
- Notify the affected reviewer of the appeal pathway.

### rep-clear-004: Unrelated old moderation action outside review window

Decision: CLEAR
Risk score: 0
Critical review: no
Suspicious events: 0

- No retaliation risk detected.

Recommended actions:
- Apply reputation changes with normal audit logging.
