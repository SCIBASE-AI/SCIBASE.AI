# Requirements Map

Issue #15 requires a community and reputation layer with peer reviews, comments, contributor credit, reputation scoring, leaderboards, badges, and incentives. This submission covers a distinct safety gate inside the peer-review/comment path so reputation signals are not polluted by unsafe or unsupported content.

| Requirement | Coverage |
| --- | --- |
| Structured peer reviews | Evaluates review modes, rubric scores, review bodies, and evidence anchors before profile impact. |
| Optional scoring on clarity, rigor, novelty, reproducibility | Blocks low scores when they lack evidence references. |
| Inline commenting | Checks artifact anchors and timeline publication readiness for comments. |
| Public, semi-private, anonymous, blind, double-blind modes | Detects reviewer identity leakage in anonymous/blind/double-blind modes. |
| Review history on profiles/project timelines | Withholds unsafe review/comment IDs from profile and timeline impact. |
| Reputation scoring | Prevents reputation-damaging scores from applying without evidence. |
| Transparent trust decisions | Writes JSON and Markdown moderation packets with blocker and warning reasons. |
| Community safety | Holds harassment, personal attacks, and protected identity disclosures before publication. |

## Non-Goals

- This is not a full reputation ledger.
- This is not a badge renewal or leaderboard eligibility module.
- This is not a broad abuse appeals system.
- This is not an endorsement-ring or Sybil detector.
