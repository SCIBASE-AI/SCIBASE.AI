# Requirements Map

| Issue #18 requirement | Implementation coverage |
| --- | --- |
| Multi-phase challenges | Tracks `currentMilestoneId`, per-milestone evidence, due dates, and resubmission windows. |
| Timeline and milestone deadlines | Stores milestone `dueAt`, feedback SLA hours, idle-risk hours, and resubmission-window hours in each packet. |
| Feedback loop between submitters and sponsors | Flags sponsor feedback requests that exceed the configured SLA and generates sponsor actions. |
| Sponsors can view submissions in a standardized evaluation dashboard | Produces normalized audit packets and a visual SVG/MP4 dashboard summary. |
| Automated checklists for deliverables | Compares required milestone evidence and reviewer packet requirements against submitted artifacts. |
| Optional third-party reviewers or peer validators | Routes complete packets to reviewers only when evidence and reviewer packet items are complete. |
| Audit logs for reproducibility | Generates stable `cmpm_` audit digests from packet facts. |
| Trust on both sides | Separates solver actions, sponsor actions, reviewer tasks, and escalation holds before arbitration. |

## Non-Overlap Statement

This slice is about in-flight milestone execution and progress management. It does not duplicate challenge posting/intake, private workspace privacy gates, rubric scoring, arbitration decisions, anti-collusion, appeals, escrow settlement, payout eligibility, sponsor reliability, amendment consent, reviewer consensus, or IP disclosure controls.
