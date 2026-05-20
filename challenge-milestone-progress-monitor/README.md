# Challenge Milestone Progress Monitor

This is a focused Scientific Bounty System slice for SCIBASE issue #18. It audits multi-phase challenge execution after intake and before final arbitration, producing deterministic packets that show whether solver teams are ready for review, need action, or should be escalated.

## Scope

- Tracks required milestone evidence for each solver team.
- Detects overdue sponsor feedback against a configured SLA.
- Flags idle solver activity before a milestone goes stale.
- Detects expired resubmission windows.
- Checks reviewer packet completeness before routing to reviewers.
- Emits stable audit digests for sponsor and arbitration records.

It intentionally does not implement bounty intake, rubric scoring, anti-collusion, payout settlement, appeals, sponsor reliability, amendment consent, reviewer consensus, or IP redaction. Those slices are already represented by other submissions on the bounty thread.

## Run

```powershell
node challenge-milestone-progress-monitor/test.js
node challenge-milestone-progress-monitor/demo.js
```

The demo writes:

- `challenge-milestone-progress-monitor/demo-output/audit-packets.json`
- `challenge-milestone-progress-monitor/demo-output/demo.svg`

This PR also includes the required short MP4 demo artifact:

- `challenge-milestone-progress-monitor/demo-output/demo.mp4`

## API

```js
const {
  auditChallengeMilestones,
  buildProgressSummary,
  createAuditDigest,
} = require("./challenge-milestone-progress-monitor");

const audit = auditChallengeMilestones({ challenge, submissions, generatedAt });
```

`auditChallengeMilestones` returns a sponsor-facing audit containing packet decisions, flags, concrete solver/sponsor/reviewer actions, summary counts, and deterministic packet digests.
