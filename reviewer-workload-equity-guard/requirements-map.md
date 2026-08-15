# Requirements Map

Issue: `SCIBASE-AI/SCIBASE.AI#15`

| Issue requirement | Implementation |
| --- | --- |
| Community and user reputation | Evaluates peer-review assignments before profile reputation, badges, leaderboards, or timeline effects are applied. |
| Fair reputation scoring | Suppresses unfair decline and late penalties when reviewers are overloaded, unavailable, opted out, resting, or assigned outside expertise. |
| Reviewer profile safety | Produces assignment-level decisions that separate allowed completion gains from blocked negative deltas. |
| Community health | Detects concentration of review credit so reputation opportunities are not captured by a small group of reviewers. |
| Non-overlap with existing slices | Focuses on workload equity and unfair penalty suppression, not recusal, timeliness scoring, edit history, profile visibility, civility, or template rubrics. |
| Safe local validation | Includes dependency-free tests and demo generation from synthetic reviewer and assignment metadata only. |

## Non-goals

- No live profile, leaderboard, badge, identity, moderation, or email mutations.
- No private reviewer data, credentials, real user records, or external calls.
- No replacement for recusal, calibration, mentorship, appeal, or rubric workflows.
